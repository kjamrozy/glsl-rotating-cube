#define MOUSE_OVER_ALPHA_GAIN 0.2

uniform float u_data[5];
#define u_time u_data[0]
#define u_width u_data[1]
#define u_height u_data[2]
#define u_mouse_x u_data[3]
#define u_mouse_y u_data[4]

#define TOP_FACE_INDEX 0.0
#define BOTTOM_FACE_INDEX 1.0
#define LEFT_FACE_INDEX 2.0
#define RIGHT_FACE_INDEX 3.0
#define BACK_FACE_INDEX 4.0
#define FRONT_FACE_INDEX 5.0
//           _______
//          | left  |
//          |   2   |
//  _______ |_______| _______ _______ 
// | front ||bottom ||  back |  top  |
// |   5   ||   1   ||   4   |   0   |
// |_______||_______||_______|_______|
//          | right |
//          |   3   |
//          |_______|
// An index of the face for which this vertex will be used.
attribute float a_faceIndex;

#define TOP_BOTTOM_FACE_TYPE 0
#define LEFT_RIGHT_FACE_TYPE 1
#define FRONT_BACK_FACE_TYPE 2
// Each face type(see defines above) has distinct color
// this uniform stores these colors.
uniform vec3 u_faceColors[3];

//
//                     top(6,7,4,5)
//                      |      back(6,7,0,1)
//                      V       /
//                   6-----7   /   
//                  /|    /| </  
//                 4-+---5 |   
//left(6,4,0,2) -->| 0---+-1 <- right (5,7,3,1)
//               ->|/    |/    
//              /  2-----3     
//             /      ^
//   front(4,5,2,3)   |
//              bottom(2,3,1,0)
//
// An index of the cube's vertex.
attribute float a_vertexIndex;

const float eps = 0.00001;

/* Varyings */
varying vec2 v_uv;
varying vec3 v_color;
varying float v_alphaGain;

mat4 rotateX(float angle) {
  float sa = sin(angle);
  float ca = cos(angle);
  return mat4(
    vec4(1.0, 0.0, 0.0, 0.0),
    vec4(0.0, ca, sa, 0.0),
    vec4(0.0, -sa, ca, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

mat4 rotateY(float angle) {
  float sa = sin(angle);
  float ca = cos(angle);
  return mat4(
    vec4(ca, 0.0, -sa, 0.0),
    vec4(0.0, 1.0, 0.0, 0.0),
    vec4(sa, 0.0, ca, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

vec4 transformCubeVertex(vec4 vertex) {
  return (
    // rotate cube accordingly to the elapsed time
    rotateX(0.4) *
    rotateY(u_time * 0.37) *
    vertex
    // move rotated cube forward a little bit
    - vec4(0.0, 0.0, 2.0, 0.0)
  );
}

vec2 computeFaceUV(vec3 dp, vec3 xDir, vec3 yDir) {
  return vec2(
    // cast point on the bottom/left/font side of the face and take coefficient FIXME: Comment
    dot(dp, xDir) / dot(xDir, xDir),
    dot(dp, yDir) / dot(yDir, yDir)
  );
}

// returns vec2(face_index, distance_to_the_face), face_index is equal to -1 of there's no intersection
// between the ray and the face
vec2 computeIntersectionDistance(float faceIndex, vec3 rayOrigin, vec3 normalizedRayDirection) {
  // first find face's normal

  // construct face's 3 adjacent corners
  vec3 bottomLeft = vec3(
    float(faceIndex == RIGHT_FACE_INDEX || faceIndex == BACK_FACE_INDEX),
    float(faceIndex == TOP_FACE_INDEX),
    float(faceIndex == FRONT_FACE_INDEX || faceIndex == RIGHT_FACE_INDEX || faceIndex == TOP_FACE_INDEX)
  );
  vec3 topLeft = vec3(
    bottomLeft.x,
    float(faceIndex != BOTTOM_FACE_INDEX),
    float(faceIndex == FRONT_FACE_INDEX || faceIndex == RIGHT_FACE_INDEX || faceIndex == BOTTOM_FACE_INDEX)
  );
  vec3 bottomRight = vec3(
    float(faceIndex != LEFT_FACE_INDEX && faceIndex != BACK_FACE_INDEX),
    float(faceIndex == TOP_FACE_INDEX),
    float(faceIndex == FRONT_FACE_INDEX || faceIndex == LEFT_FACE_INDEX || faceIndex == TOP_FACE_INDEX) 
  );
  // transform vertices
  bottomLeft = transformCubeVertex(vec4(bottomLeft - 0.5, 1.0)).xyz;
  topLeft = transformCubeVertex(vec4(topLeft - 0.5, 1.0)).xyz;
  bottomRight = transformCubeVertex(vec4(bottomRight - 0.5, 1.0)).xyz;

  vec3 xDir = bottomRight - bottomLeft;
  vec3 yDir = topLeft - bottomLeft;
  vec3 faceNormal = normalize(cross(yDir, xDir));

  float d = dot(normalizedRayDirection, faceNormal);
  // if d == 0 then it means that ray is parallel to the face so they can't intersect
  if (abs(d) < eps) { return vec2(-1.0, 0.0); }

  float distance = dot(bottomLeft - rayOrigin, faceNormal) / d;

  vec3 intersectionPoint = rayOrigin + distance * normalizedRayDirection;

  // The intersectionPoint lies on the plane that contains cube's face but
  // not neccessarily on the face itself. Let's convert intersectionPoint to uv coordinates
  // to see if it lies within [0,0] x [1,1] and therefore lies within the face.
  vec2 uv = computeFaceUV(intersectionPoint - bottomLeft, xDir, yDir);
  return mix(
    vec2(faceIndex, distance),
    vec2(-1.0, 0.0),
    float(min(uv.x, uv.y) < 0.0 || max(uv.x, uv.y) > 1.0)
  );
}

float computeIntersectedFaceIndex(vec3 rayOrigin, vec3 normalizedRayDirection) {
  vec4 intersections01 = vec4(
    computeIntersectionDistance(TOP_FACE_INDEX, rayOrigin, normalizedRayDirection),
    computeIntersectionDistance(BOTTOM_FACE_INDEX, rayOrigin, normalizedRayDirection)
  );
  vec4 intersections23 = vec4(
    computeIntersectionDistance(LEFT_FACE_INDEX, rayOrigin, normalizedRayDirection),
    computeIntersectionDistance(RIGHT_FACE_INDEX, rayOrigin, normalizedRayDirection)
  );
  vec4 intersections34 = vec4(
    computeIntersectionDistance(FRONT_FACE_INDEX, rayOrigin, normalizedRayDirection),
    computeIntersectionDistance(BACK_FACE_INDEX, rayOrigin, normalizedRayDirection)
  );

  vec2 closestIntersection = vec2(-1.0, 0.0); // (face index, distance)

  #define updateClosestIntersection(intersection)\
    closestIntersection = mix(\
      closestIntersection,\
      intersection,\
      max(\
        float(closestIntersection.x < 0.0),\
        float(intersection.x >= 0.0 && intersection.y < closestIntersection.y)\
      )\
    )

  updateClosestIntersection(intersections01.xy);
  updateClosestIntersection(intersections01.zw);
  updateClosestIntersection(intersections23.xy);
  updateClosestIntersection(intersections23.zw);
  updateClosestIntersection(intersections34.xy);
  updateClosestIntersection(intersections34.zw);

  return closestIntersection.x;
}

// http://www.songho.ca/opengl/gl_projectionmatrix.html
mat4 frustum(float l, float r, float b, float t, float n, float f) {
  return mat4(
    vec4(2.0 * n / (r - l), 0.0, 0.0, 0.0),
    vec4(0.0, 2.0 * n / (t - b), 0.0, 0.0),
    vec4((r + l) / (r - l), (t + b) / (t - b), -(f + n) / (f - n), -1.0),
    vec4(0.0, 0.0, -2.0 * f * n / (f - n), 0.0)
  );
}

void main() {
  // construct cube's vertex
  float isRight = mod(a_vertexIndex, 2.0);
  float isTop = float(a_vertexIndex > 3.5);
  float isFront = float(a_vertexIndex > 1.5 && a_vertexIndex < 5.5);
  vec4 vertex = transformCubeVertex(vec4(
    vec3(isRight, isTop, isFront) - 0.5,
    1.0
  )); // a vertex of the cube [-0.5, -0.5, -0.5] x [0.5, 0.5, 0.5]

  float aspectRatio = u_width / u_height;
  // create projection for aspectRatio such that it fits (-1,-1)x(1,1) rectangle
  // and centers around it
  float lr = max(1.0, aspectRatio);
  float bt = max(1.0, 1.0 / aspectRatio);
  mat4 projection = frustum(-lr/2.0, lr/2.0, -bt/2.0, bt/2.0, 1.0, 100.0);

  vec2 mouseNDC = 2.0 * vec2(u_mouse_x, 1.0 - u_mouse_y) - 1.0;
  vec3 mouseRayDirection = normalize(vec3(
    vec2(lr / 2.0, bt / 2.0) * mouseNDC,
    -1.0
  ));

  int faceType = int(a_faceIndex / 2.0);
  v_color = u_faceColors[faceType];

  float intersectedFaceIndex = computeIntersectedFaceIndex(vec3(0.0, 0.0, 0.0), mouseRayDirection);
  v_alphaGain = MOUSE_OVER_ALPHA_GAIN * float(intersectedFaceIndex == a_faceIndex);

  v_uv = vec2(
    mix(isFront, isRight, float(faceType != LEFT_RIGHT_FACE_TYPE)),
    mix(isTop, isFront, float(faceType == TOP_BOTTOM_FACE_TYPE))
  );

  // apply perspective projection and return
  gl_Position = projection * vertex;
}
