#version 300 es
precision highp float;

in vec2 aPosition;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

out vec2 vWorldPos;

void main() {
    vec3 localWorld = uTransformMatrix * vec3(aPosition, 1.0);
    vWorldPos = localWorld.xy;

    vec3 clip = uProjectionMatrix * uWorldTransformMatrix * localWorld;
    gl_Position = vec4(clip.xy, 0.0, 1.0);
}
