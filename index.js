const io = require("socket.io")()
const mdns = require("mdns")
const execa = require("execa")
const path = require("path")

const port = 8888
const ad = mdns.createAdvertisement(mdns.tcp("http"), port, {
  name: "DOMOPETS_WaterDispenser",
})

const hx711Path = path.join(__dirname, "..", "hx711py")
const tare_cmd = path.join(hx711Path, "tare")
const measure_cmd = path.join(hx711Path, "measure")

async function tare() {
  const {stdout} = await execa(tare_cmd)
  return parseInt(stdout)
}

async function measure(tare) {
  const {stdout, stderr} = await execa(measure_cmd, [tare])
  return parseInt(stdout)
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
    io.emit("measure", await measure(tareVal))
    setTimeout(measureLoop, 200)
  }
  measureLoop()
})

io.on("connection", socket => {
  socket.on("tare", () => (tareTriggered = true))
})

io.listen(port)
