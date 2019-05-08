docker run --rm \
    -it \
    --volume "$(dirname $(pwd))":/home/lawmakers-manager \
    lawmakers \
    bash
