export const beamVertexShader = `
precision highp float;

in vec2 aStart;
in vec2 aEnd;
in vec2 aExtrude;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform float uCameraScale;

uniform float uBeamThickness;
uniform float uBeamDashLength;
uniform float uBeamGapLength;
uniform float uBeamOffset;

out vec2 vPos;
out vec2 vStart;
out vec2 vEnd;

void main() {
    vec2 dir = aEnd - aStart;
    float len = length(dir);
    vec2 normDir = len > 0.0 ? dir / len : vec2(1.0, 0.0);
    vec2 normal = vec2(-normDir.y, normDir.x);

    float maxRadius = uBeamThickness / 2.0 + abs(uBeamOffset);
    float fixedRadius = maxRadius / uCameraScale;

    vec2 basePos = mix(aStart, aEnd, (aExtrude.x + 1.0) / 2.0);
    vec2 offset = normal * aExtrude.y * fixedRadius + normDir * aExtrude.x * fixedRadius;
    vec2 finalPos = basePos + offset;

    vPos = finalPos;
    vStart = aStart;
    vEnd = aEnd;

    mat3 worldMatrix = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((worldMatrix * vec3(finalPos, 1.0)).xy, 0.0, 1.0);
}
`;
