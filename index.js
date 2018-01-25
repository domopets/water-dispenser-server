const execa = require("execa")
const path = require("path")
const {Gpio} = require("onoff")
const a = require("awaiting")

const valve = new Gpio(18, "out")
const socket = require("socket.io-client")("https://domopets.herokuapp.com/")

const hx711Path = path.join(__dirname, "..", "hx711py")
const tare_cmd = path.join(hx711Path, "tare")
const measure_cmd = path.join(hx711Path, "measure")

const cron = require("node-cron")

async function tare() {
  const {stdout} = await execa(tare_cmd)
  return parseInt(stdout)
}

async function measure(tare) {
  const {stdout, stderr} = await execa(measure_cmd, [tare])
  return parseInt(stdout)
}

async function dispenseWater() {
  valve.writeSync(1)
  await a.delay(10000)
  valve.writeSync(0)
}

let tareVal
let tareTriggered = false
tare().then(async val => {
  tareVal = val
  const measureLoop = async () => {
    if (tareTriggered) {
      console.log("reset tare")
      tareVal = await tare()
      tareTriggered = false
    }
    const measureValue = await measure(tareVal)
    socket.emit("dispatch", {
      action: "measure",
      payload: measureValue,
    })
    console.log(measureValue)
    setTimeout(measureLoop, 200)
  }
  measureLoop()
})

socket.on("connect", () => {
  socket.emit("type", "WATER")
})
socket.on("tare", () => (tareTriggered = true))
socket.on("dispenseWater", dispenseWater)

let currentTask = null
socket.on("schedule", ({h, m}) => {
  console.log(`schedule h: ${h}, m: ${m}`)
  if (currentTask) {
    currentTask.destroy()
  }
  currentTask = cron.schedule(
    `${m} ${h - 1} * * *`,
    () => {
      dispenseWater()
      console.log("task running")
    },
    true,
  )
})
socket.on("unschedule", () => {
  console.log("unschedule")
  if (currentTask) currentTask.destroy()
  currentTask = null
})
