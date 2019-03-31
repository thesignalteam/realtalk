// our dependencies
const express = require('express');
const bodyParser = require('body-parser');
const escape = require('escape-html');
const admin = require('@tryghost/admin-api');
const converter = require('@tryghost/html-to-mobiledoc');
const grecaptcha = require('grecaptcha');

const app = express();

app.use(bodyParser.urlencoded({extended: false}));

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