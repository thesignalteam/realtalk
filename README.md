# thesignal-realtalk

Repository for [RealTalk Penn](https://realtalkpenn.com/about), an anonymous Q&A forum for the University of Pennsylvania
 community, inspired by the Princeton counterpart.
 
### Docker Containers
- **Ghost**: backend CMS and Handlebar.js template renderer.
- **MySQL**: content database.
- **Node.js**: APIs for submitting questions and verifying reCAPTCHA.
- **Nginx**: reverse proxy to route traffic to Ghost and API server. 
 
### Contributing
Everyone is welcomed to submit pull requests.

### License
![CC BY-NC-SA](https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License")
<br>
*\* License only applies to the current codebase. Not the project itself.*

### Running Locally

*Warning: may not be compatible with Windows.*

1. Install `node`, `docker`, `docker-compose` and `git`, if you haven't already.
2. Run `git clone https://github.com/linzhiq/thesignal-realtalk.git && cd thesignal-realtalk`.
3. Run `./run.sh setup` before running the server for the first time, or when you want to pull the latest code from GitHub.
4. Run `./run.sh dev` to start your server. It will shut down automatically when you close the terminal window.