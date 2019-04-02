// our dependencies
const express = require('express');
const bodyParser = require('body-parser');
const escape = require('escape-html');
const admin = require('@tryghost/admin-api');
const converter = require('@tryghost/html-to-mobiledoc');
const grecaptcha = require('grecaptcha');
const jimp = require('jimp');
const fs = require('fs');

const app = express();

app.use(bodyParser());

// Outgoing APIs
const captcha = process.env.RECAPTCHA === "on" ? new grecaptcha(process.env.RECAPTCHA_KEY) : undefined;

console.log(process.env.GHOST_API_PATH);

const ghost = new admin({
    url: process.env.GHOST_API_PATH,
    key: process.env.GHOST_KEY,
    version: 'v2'
});

// from top level path e.g. localhost:3000, this response will be sent
app.get('/', (request, response) => response.send('Hello World'));

app.get('/api', function (request, response) {
    response.send("Oh look! You found the API.");
});

let remove_html = function (string) {
    return string.replace(/(<([^>]+)>)/ig, "");
};

let update_og_image = async function (request, response, retries) {
    console.log(request.body);

    if (request.body.post.current.published_at === null) {
        // Post not published yet
        return;
    }

    if ('feature_image' in request.body.post.previous || retries > 3) {
        // Avoid circular requests
        return;
    }

    let slug = request.body.post.current.slug;
    let date = new Date(new Date(request.body.post.current.updated_at) + 1 * 1000).toISOString();
    // Offset by 10 seconds to avoid race condition

    let img_path = "./cache/" + slug + "." + date + ".png";
    let logo = await jimp.read("./fonts/logo.png");
    let text_Q = await jimp.read("./fonts/Q.png");
    let text_A = await jimp.read("./fonts/A.png");

    let html_blocks = request.body.post.current.html.split("<hr>");
    let text_question = remove_html(html_blocks[0]);
    let text_answer = html_blocks.length > 1 ? remove_html(html_blocks[1].split("<blockquote>")[0]): "";

    let width = 860;
    let spacing = "     ";

    console.log(text_question, text_answer);

    let image = new jimp(1200, 630, 0xffffffff, (err, image) => {
        jimp.loadFont("./fonts/font.fnt").then(font => {
            let height = 60;

            image.blit(logo, 40, 30);
            image.blit(text_Q, 280, height + 13);

            image.print(
                font,
                280, height,
                spacing + text_question,
                width
            );

            height += jimp.measureTextHeight(font, spacing + text_question, width) + 30;
            image.blit(text_A, 280, height + 15);

            image.print(
                font,
                280, height,
                spacing + text_answer,
                width
            );

            image.write(img_path, function (err) {
                ghost.images
                    .upload({file: img_path})
                    .then(function (data) {
                        console.log(data);

                        ghost.posts
                            .edit({
                                id: request.body.post.current.id,
                                feature_image: data.url,
                                updated_at: date
                            })
                            .then(function (data) {
                                console.log(data);
                            })
                            .catch(function (err) {
                                setTimeout(update_og_image, 5 * 1000 * (retries + 1), request, response, retries + 1);
                            });
                    })
                    .catch(function (err) {
                    });
            });
        });
    }); // Facebook OG size: 1200 x 630
};

app.post('/api/webhook/updated', function (req, res) {
    update_og_image(req, res, 0);

    res.status(200);
    res.send("gotchu");
});

const check_slug = function (question, tags, response) {
    let slug = Math.random().toString(16).substring(2, 2 + 6).toUpperCase(); // Random hex string of length 6

    ghost.posts
        .read({slug: slug})
        .then(function () {
            return check_slug(question, tags, response);
        })
        .catch(function (err) {
            if (err.type === "ValidationError" || err.type === "NotFoundError") {
                // create_question(question, tags, slug, response);
                get_contributors(question, tags, slug, response);
            } else {
                console.log(err);
                response.statusCode = 401;
                response.send("Database indexing error");
            }
        });
};

const get_contributors = function (question, tags, slug, response) {
    ghost.pages
        .read({slug: 'active-contributors'})
        .then(function (data) {
            let contributors = data['authors'].map(x => x['email']);
            create_question(question, tags, slug, contributors, response)
        })
        .catch(function (err) {
            console.log(err);
            response.statusCode = 401;
            response.send("Contributor database indexing error");
        })
};

const create_question = function (question, tags, slug, contributors, response) {
    ghost.tags.browse().then(function (data) {
        let resolved_tags = [];

        if (tags && tags.length !== 0) {
            for (let tag of data) {
                if (tag.hasOwnProperty('slug') && tags.indexOf(tag['slug']) !== -1) {
                    resolved_tags.push(tag['name']);
                }
            }
        }

        console.log({
            title: '#' + slug + ": " + resolved_tags.join(", "),
            slug: slug,
            tags: resolved_tags,
            authors: contributors,
            mobiledoc: JSON.stringify(converter.toMobiledoc('<b>' + escape(question).split("\r\n").join("<br>") + '</b> <hr>'))
        });

        ghost.posts.add({
            title: '#' + slug + ": " + resolved_tags.join(", "),
            slug: slug,
            tags: resolved_tags,
            authors: contributors,
            mobiledoc: JSON.stringify(converter.toMobiledoc('<b>' + escape(question).split("\r\n").join("<br>") + '</b> <hr>'))
        }).then(function (data) {
            console.log("Post created: " + slug);
            console.log(data);
            response.statusCode = 200;
            response.send(slug.toLowerCase());
        }).catch(function (err) {
            console.log(err);
            response.statusCode = 401;
            response.send("Post creation error");
        });
    }).catch(function (err) {
        console.log(err);
        response.statusCode = 401;
        response.send("Failed to get tags")
    });
};

app.post('/api/ask', function (request, response) {
    console.log(request.body);

    if (captcha) {
        captcha.verify(request.body['g-recaptcha-response']).then((accepted) => {
            return check_slug(request.body.question, request.body.tags, response);
        }).catch((err) => {
            // Request failed.
            response.statusCode = 401;
            response.send("Recaptcha failed");

            console.log(err);
        });
    } else {
        return check_slug(request.body.question, request.body.tags, response);
    }
});

// set the server to listen on port 3000
app.listen(3000, () => console.log('Listening on port 3000'));