#!/usr/bin/env bash

while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    setup) #|--setup|-s
        git stash
        git pull --recurse-submodules
        cd static && npm install

        cd ./prebuilt
        for f in * ; do
          cp -r "$f/*" "../$f/dist/"
        done
        cd ..

        cp ../configs/development/env/env ../.env
        cd ..

        cd api && npm install
        cd ..

        docker-compose pull
        shift # past argument
    ;;

    d|dev|development)
        cp ./configs/development/env/env ./.env
        docker-compose up
        shift # past argument
    ;;

    p-d|prod-debug|production-debug)
        cp ~/env ./.env
        docker-compose up
        shift # past argument
    ;;

    p|prod|production)
        cp ~/env ./.env
        docker-compose up -d
        shift # past argument
    ;;

    stop|down)
        docker-compose down
        shift # past argument
    ;;

    r|restart)
        docker-compose down
        cp ~/env ./.env
        docker-compose up -d
        shift # past argument
    ;;
esac
done