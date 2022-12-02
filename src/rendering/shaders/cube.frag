precision mediump float;

// Specifies how many times x/y-wise pattern should be repeated within cube face.
// ** Pattern consists of 4 squares, 2 "black" ones and 2 "white" ones. **
#define PATTERN_REPEAT_CNT 2.0

#define BLACK_SQUARE_ALPHA 0.2
#define WHITE_SQUARE_ALPHA 0.8

varying vec2 v_uv;
varying vec3 v_color;
varying float v_alphaGain;

void main() {
  vec2 pattern = clamp(v_uv, 0.0, 1.0) * 2.0 * PATTERN_REPEAT_CNT;
  float squareAlpha = mix(BLACK_SQUARE_ALPHA, WHITE_SQUARE_ALPHA, floor(
    mod(pattern.x  + floor(mod(pattern.y, 2.0)), 2.0)
  ));
  float alpha = clamp(squareAlpha + v_alphaGain, 0.0, 1.0);
  gl_FragColor = vec4(v_color * alpha, alpha);
}
