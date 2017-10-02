FROM library/nginx:latest
LABEL maintainer="Holger Imbery <contact@connectedobjects.cloud>" \
      version="1.1" \
      description="mqtt-admin dockerized version of https://github.com/hobbyquaker/mqtt-admin"

RUN apt-get update \
 && apt-get install -y -q --no-install-recommends unzip \
    ca-certificates \
    bash \
    nginx \
    unzip \
 && apt-get clean \
 && rm -r /var/lib/apt/lists/*

ENV DOCKER_HOST unix:///tmp/docker.sock
ADD https://github.com/hobbyquaker/mqtt-admin/releases/download/v1.0.0/mqtt-admin_1.0.0.zip .
RUN unzip mqtt-admin_1.0.0.zip -d /usr/share/nginx/html
RUN cp -R /usr/share/nginx/html/mqtt-admin/* /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/mqtt-admin
RUN rm /mqtt-admin_1.0.0.zip

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
