FROM python:3.12.9-bookworm
LABEL maintainer="jerlendds <oss@osintbuddy.com>"

RUN apt-get -y update && apt-get -y install chromium chromium-driver && \
    apt-get clean
RUN mkdir /app && \
    cd /app && \
    pip3 install --no-cache-dir --upgrade pip
COPY osintbuddy-plugins /app
RUN cd /app && \
    pip3 install --no-cache-dir -e /app
