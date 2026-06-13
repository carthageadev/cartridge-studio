// Quick GLB inspector: prints node hierarchy, mesh names, and POSITION bounds
import { readFileSync } from 'node:fs'

const buf = readFileSync(process.argv[2])
const jsonLen = buf.readUInt32LE(12)
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))

console.log('== Nodes ==')
gltf.nodes?.forEach((n, i) =>
  console.log(i, JSON.stringify({ name: n.name, mesh: n.mesh, children: n.children, translation: n.translation, rotation: n.rotation, scale: n.scale }))
)
console.log('== Meshes ==')
gltf.meshes?.forEach((m, i) => {
  m.primitives.forEach(p => {
    const acc = gltf.accessors[p.attributes.POSITION]
    console.log(i, m.name, 'POS min', acc.min, 'max', acc.max, 'material', p.material)
  })
})
console.log('== Materials ==')
gltf.materials?.forEach((m, i) => console.log(i, m.name))
console.log('== Scenes ==', JSON.stringify(gltf.scenes))
