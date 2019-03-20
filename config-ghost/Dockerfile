FROM ghost:2.18.1
RUN apt-get update -y && \
    apt-get install -y mysql-client
COPY ./wait.sh /usr/local/bin/wait.sh