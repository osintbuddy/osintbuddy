#!/bin/env bash
# TODO: test me...

sudo apt update
sudo apt install libssl-dev git build-essential pkg-config docker

# installing docker
if ! command -v docker >/dev/null 2>&1
then
    echo "docker not found. installing docker..."
    sudo apt-get install ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    # Add the repository to Apt sources:
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi


# I use alacritty so this makes my life easier :)
curl -sSL https://raw.githubusercontent.com/alacritty/alacritty/master/extra/alacritty.info | tic -x -

if ! command -v cargo >/dev/null 2>&1
then
    echo "cargo not found. installing rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
fi

if ! command -v sqlx >/dev/null 2>&1
then
    echo "sqlx-cli not found. installing sqlx-cli..."
    cargo install sqlx-cli --no-default-features --features native-tls,postgres
fi

if ! command -v nvm >/dev/null 2>&1
then
    echo "nvm not found. installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
    nvm install 20
    npm i --global yarn
fi

cd frontend/
yarn && yarn build
cd ..

docker compose up db -d
cd rs/
sqlx migrate run
cargo build --release

echo "OSINTBuddy is ready to be started!"
echo "Run the following command to start the server (remember to update your rs/.env file):"
echo "cd rs/ && ./target/release/osib &"
