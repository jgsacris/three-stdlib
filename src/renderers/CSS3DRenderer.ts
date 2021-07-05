import { Camera, Matrix4, Object3D, OrthographicCamera, PerspectiveCamera, Scene } from 'three'

/**
 * Based on http://www.emagix.net/academic/mscs-project/item/camera-sync-with-css3-and-webgl-threejs
 */

class CSS3DObject extends Object3D {
  public readonly isCSS3DObject = true

  constructor(public element: HTMLElement) {
    super()

    this.element = element || document.createElement('div')
    this.element.style.position = 'absolute'
    this.element.style.pointerEvents = 'auto'

    this.addEventListener('removed', function () {
      this.traverse(function (object: CSS3DObject) {
        if (object.element instanceof Element && object.element.parentNode !== null) {
          object.element.parentNode.removeChild(object.element)
        }
      })
    })
  }

  public copy(source: this, recursive?: boolean | undefined): this {
    super.copy(source, recursive)

    this.element = source.element.cloneNode(true) as HTMLElement

    return this
  }
}

class CSS3DSprite extends CSS3DObject {
  public readonly isCSS3DSprite = true
  public rotation2D: number
  constructor(element: HTMLElement) {
    super(element)

    this.rotation2D = 0
  }

  public copy(source: this, recursive: boolean): this {
    super.copy(source, recursive)

    this.rotation2D = source.rotation2D

    return this
  }
}

//

const _matrix = new Matrix4()
const _matrix2 = new Matrix4()

class CSS3DRenderer {
  public domElement: HTMLElement
  private _width: number = 0
  private _height: number = 0
  private _widthHalf: number = 0
  private _heightHalf: number = 0
  private cache: {
    camera: { fov: 0; style: '' }
    objects: WeakMap<any, any>
  }
  private cameraElement: HTMLElement

  constructor() {
    const _this = this
    this.cache = {
      camera: { fov: 0, style: '' },
      objects: new WeakMap(),
    }

    const domElement = document.createElement('div')
    domElement.style.overflow = 'hidden'

    this.domElement = domElement

    this.cameraElement = document.createElement('div')

    this.cameraElement.style.transformStyle = 'preserve-3d'
    this.cameraElement.style.pointerEvents = 'none'

    domElement.appendChild(this.cameraElement)
  }

  public render = function (scene: Scene, camera: PerspectiveCamera | OrthographicCamera): void {
    const fov = camera.projectionMatrix.elements[5] * this._heightHalf

    if (this.cache.camera.fov !== fov) {
      this.domElement.style.perspective = (camera as PerspectiveCamera).isPerspectiveCamera ? fov + 'px' : ''
      this.cache.camera.fov = fov
    }

    if (scene.autoUpdate === true) scene.updateMatrixWorld()
    if (camera.parent === null) camera.updateMatrixWorld()

    let tx, ty
    camera = camera as OrthographicCamera
    if (camera.isOrthographicCamera) {
      tx = -(camera.right + camera.left) / 2
      ty = (camera.top + camera.bottom) / 2
    }

    const cameraCSSMatrix = camera.isOrthographicCamera
      ? 'scale(' +
        fov +
        ')' +
        'translate(' +
        this.epsilon(tx) +
        'px,' +
        this.epsilon(ty) +
        'px)' +
        this.getCameraCSSMatrix(camera.matrixWorldInverse)
      : 'translateZ(' + fov + 'px)' + this.getCameraCSSMatrix(camera.matrixWorldInverse)

    const style = cameraCSSMatrix + 'translate(' + this._widthHalf + 'px,' + this._heightHalf + 'px)'

    if (this.cache.camera.style !== style) {
      this.cameraElement.style.transform = style

      this.cache.camera.style = style
    }

    this.renderObject(scene, scene, camera, cameraCSSMatrix)
  }

  public setSize = function (width: number, height: number): void {
    this._width = width
    this._height = height
    this._widthHalf = this._width / 2
    this._heightHalf = this._height / 2

    this.domElement.style.width = width + 'px'
    this.domElement.style.height = height + 'px'

    this.cameraElement.style.width = width + 'px'
    this.cameraElement.style.height = height + 'px'
  }

  public epsilon(value: number): number {
    return Math.abs(value) < 1e-10 ? 0 : value
  }

  public getCameraCSSMatrix(matrix: Matrix4): string {
    const elements = matrix.elements

    return (
      'matrix3d(' +
      this.epsilon(elements[0]) +
      ',' +
      this.epsilon(-elements[1]) +
      ',' +
      this.epsilon(elements[2]) +
      ',' +
      this.epsilon(elements[3]) +
      ',' +
      this.epsilon(elements[4]) +
      ',' +
      this.epsilon(-elements[5]) +
      ',' +
      this.epsilon(elements[6]) +
      ',' +
      this.epsilon(elements[7]) +
      ',' +
      this.epsilon(elements[8]) +
      ',' +
      this.epsilon(-elements[9]) +
      ',' +
      this.epsilon(elements[10]) +
      ',' +
      this.epsilon(elements[11]) +
      ',' +
      this.epsilon(elements[12]) +
      ',' +
      this.epsilon(-elements[13]) +
      ',' +
      this.epsilon(elements[14]) +
      ',' +
      this.epsilon(elements[15]) +
      ')'
    )
  }

  public getObjectCSSMatrix(matrix: Matrix4): string {
    const elements = matrix.elements
    const matrix3d =
      'matrix3d(' +
      this.epsilon(elements[0]) +
      ',' +
      this.epsilon(elements[1]) +
      ',' +
      this.epsilon(elements[2]) +
      ',' +
      this.epsilon(elements[3]) +
      ',' +
      this.epsilon(-elements[4]) +
      ',' +
      this.epsilon(-elements[5]) +
      ',' +
      this.epsilon(-elements[6]) +
      ',' +
      this.epsilon(-elements[7]) +
      ',' +
      this.epsilon(elements[8]) +
      ',' +
      this.epsilon(elements[9]) +
      ',' +
      this.epsilon(elements[10]) +
      ',' +
      this.epsilon(elements[11]) +
      ',' +
      this.epsilon(elements[12]) +
      ',' +
      this.epsilon(elements[13]) +
      ',' +
      this.epsilon(elements[14]) +
      ',' +
      this.epsilon(elements[15]) +
      ')'

    return 'translate(-50%,-50%)' + matrix3d
  }

  public renderObject(object: Object3D, scene: Scene, camera: Camera, cameraCSSMatrix: Matrix4): void {
    if ((object as CSS3DObject).isCSS3DObject) {
      const css3DObject = object as CSS3DObject
      css3DObject.onBeforeRender(this as any, scene, camera, null as any, null as any, null as any)

      let style

      if ((object as CSS3DSprite).isCSS3DSprite) {
        // http://swiftcoder.wordpress.com/2008/11/25/constructing-a-billboard-matrix/
        const object2d = object as CSS3DSprite
        _matrix.copy(camera.matrixWorldInverse)
        _matrix.transpose()

        if (object2d.rotation2D !== 0) _matrix.multiply(_matrix2.makeRotationZ(object2d.rotation2D))

        _matrix.copyPosition(object.matrixWorld)
        _matrix.scale(object.scale)

        _matrix.elements[3] = 0
        _matrix.elements[7] = 0
        _matrix.elements[11] = 0
        _matrix.elements[15] = 1

        style = this.getObjectCSSMatrix(_matrix)
      } else {
        style = this.getObjectCSSMatrix(object.matrixWorld)
      }

      const element = css3DObject.element
      const cachedObject = this.cache.objects.get(object)

      if (cachedObject === undefined || cachedObject.style !== style) {
        element.style.transform = style

        const objectData = { style: style }
        this.cache.objects.set(object, objectData)
      }

      element.style.display = object.visible ? '' : 'none'

      if (element.parentNode !== this.cameraElement) {
        this.cameraElement.appendChild(element)
      }

      object.onAfterRender(this as any, scene, camera, null as any, null as any, null as any)
    }

    for (let i = 0, l = object.children.length; i < l; i++) {
      this.renderObject(object.children[i], scene, camera, cameraCSSMatrix)
    }
  }
}

export { CSS3DObject, CSS3DSprite, CSS3DRenderer }
