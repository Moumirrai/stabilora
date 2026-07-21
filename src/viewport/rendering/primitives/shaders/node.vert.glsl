#version 300 es
precision highp float;

in vec2 aPosition;
in float aState;

uniform float uPointSize;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform float uRes;

out float vState;

#define GLOW_PADDING 24.0

void main() {
    gl_PointSize = (uPointSize + GLOW_PADDING) * uRes;

    vState = aState;

    mat3 worldMatrix = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((worldMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}
