This is a fork from https://github.com/hobbyquaker/mqtt-admin used to generate Docker Images. See original documentation for reference about the script itself.

### Usage with Docker

The Docker Image uses Nginx to create a websocket relay to your MQTT broker, specified in the ENV variable `MQTT_HOST`, e.g.:

	docker run -p 8001:80 -e "MQTT_HOST=10.1.1.100:9001" dersimn/mqtt-admin

Specifying the ENV variable enables auto-connect to your broker without further configuration after opening the website.
