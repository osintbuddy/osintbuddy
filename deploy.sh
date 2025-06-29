#!/bin/env bash
# TODO: test me...

sudo apt update
sudo apt install libssl-dev build-essential pkg-config docker

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

if [ ! -d "./frontend/node_modules" ]; then
  echo "installing frontend dependencies..."
  cd frontend
  yarn
  cd ..
fi

cd frontend/
yarn build
cd ..

cd rs/
cargo build --release

echo "OSINTBuddy is ready to be started!"
echo "Run the following command to start the server:"
echo "cd rs/ && ./target/release/osib &"
