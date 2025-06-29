#!/bin/env bash
# Tested on Debian 12!

NC='\e[0m' # no color/color off
RED='\033[0;31m'
GREEN='\033[0;32m' 
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
iYELLOW='\033[0;93m'

# update system
printf "${PURPLE}Updating your system...${NC}\n"
sudo apt update -y

# check for and install missing packages
packages_to_install=()
for package in "neovim" "libssl-dev" "git" "build-essential" "pkg-config" "docker"; do
    printf "${PURPLE}checking for $package...${NC}\n"
    if ! dpkg -s $package | grep -q "Status: install ok installed"; then
        packages_to_install+=("$package")
        printf "${RED} $package is not installed and required!${NC}\n"
    fi
done

if [ ${#packages_to_install[@]} -gt 0 ]; then
    printf "${GREEN}Installing missing packages: ${packages_to_install[*]}${NC}\n"
    sudo apt install -y "${packages_to_install[@]}"
else
    printf "${GREEN}All required packages are installed${NC}\n"
fi

# installing docker if not found
if ! command -v docker >/dev/null 2>&1
then
    printf "${RED}docker not found! ${NC}\n"
    printf "${PURPLE}installing docker...${NC}\n"
    sudo apt-get install ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi


# I use alacritty so this makes my life easier :)
curl -sSL https://raw.githubusercontent.com/alacritty/alacritty/master/extra/alacritty.info | tic -x -

# check for rust
if ! command -v cargo >/dev/null 2>&1
then
    printf "${RED}cargo/rust not found!${NC}\n"
    printf "${GREEN}installing rustup toolchain...${NC}\n"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
fi

# check for sqlx-cli
if ! command -v sqlx >/dev/null 2>&1
then
    printf "${RED}sqlx-cli not found.${NC}"
    printf "${GREEN}installing sqlx-cli...${NC}"
    cargo install sqlx-cli --no-default-features --features native-tls,postgres
fi

# check for nvm
if ! command -v nvm >/dev/null 2>&1
then
    printf "${RED}nvm not found!${NC}\n"
    printf "${PURPLE}installing nvm, node, and yarn...${NC}\n"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
    nvm install 20
    npm i --global yarn
fi

printf "${PURPLE}Installing frontend deps and building...${NC}\n"
cd frontend/
yarn && yarn build
cd ..

# start db so we can run migrations needed to compile the server with sqlx
printf "${PURPLE}Starting docker db and running migrations...${NC}\n"
docker compose up db -d
cd rs/
sqlx migrate run
printf "${PURPLE}Building rust server...${NC}\n"
cargo build --release

printf "${PURPLE}OSINTBuddy is ready to be started!\nRun the following command to start the server ${iYELLOW}(remember to update your rs/.env file)${NC}:\n\n"
printf "${GREEN}cd rs/ && ./target/release/osib &${NC}\n\n"
