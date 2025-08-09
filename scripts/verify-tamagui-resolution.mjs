import { createRequire } from 'module'

const req = createRequire(import.meta.url)

function check(name) {
  try {
    const p = req.resolve(name)
    console.log(`OK: ${name} -> ${p}`)
  } catch (e) {
    console.error(`FAIL: ${name} -> ${e.message}`)
    process.exitCode = 1
  }
}

check('tamagui')
check('@tamagui/config/v4')
