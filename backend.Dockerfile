FROM python:3.12.9-bookworm
LABEL maintainer="jerlendds <oss@osintbuddy.com>"

WORKDIR /app
ENV PYTHONPATH=/app
RUN pip3 install --no-cache-dir --upgrade pip;
COPY backend/requirements.txt /requirements.txt
RUN pip3 install --no-cache-dir -r /requirements.txt

COPY ./backend /app
COPY ./osintbuddy-plugins /osintbuddy-plugins
RUN cd /osintbuddy-plugins && \
    pip install -e .

EXPOSE 3001
CMD ["/bin/bash", "-c", "./start.sh"]
