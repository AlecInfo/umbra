# Standalone DERP relay (tailscale.com/cmd/derper), built from source.
# No official Docker image is published by Tailscale — we pin a version
# matching the tailscale clients used by the agents.
FROM golang:1.23-alpine AS build
ARG DERPER_VERSION=v1.78.1
RUN go install tailscale.com/cmd/derper@${DERPER_VERSION}

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /go/bin/derper /usr/local/bin/derper
EXPOSE 80 443 3478/udp
ENTRYPOINT ["derper"]
