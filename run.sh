#!/usr/bin/env bash

while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    setup) #|--setup|-s
        git pull --recurse-submodules
        cd static && npm install

        cd ./prebuilt
        mkdir ../jquery/dist/
        mkdir ../semantic/dist/
        mkdir ../sugar/dist/
        cp jquery.min.js ../jquery/dist/
        cp semantic.min.js ../semantic/dist/
        cp semantic.min.css ../semantic/dist/
        cp sugar.min.js ../sugar/dist/
        cd ..

        cp ../configs/development/env/env ../.env
        cd ..

        docker-compose pull
        shift # past argument
    ;;

    dev|development)
        cp ./configs/development/env/env ./.env
        docker-compose up
        shift # past argument
    ;;

    prod|production)
        cp ~/env ./.env
        docker-compose up -d
        shift # past argument
    ;;
esac
done