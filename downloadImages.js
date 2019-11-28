const axios = require('axios')
const fs = require('fs')
const jimp = require('jimp')

//module.exports = () => {}
axios.get('https://ddragon.leagueoflegends.com/api/versions.json', { json: true }).then(versions => {
    const version = versions.data[0]
    axios.get('https://ddragon.leagueoflegends.com/cdn/' + version +
        '/data/en_US/champion.json', { json: true }).then(champions => {
            const names = Object.keys(champions.data.data)
            let promises = []
            for (i in names) {
                const name = names[i]
                promises.push(
                    axios({
                        method: 'get',
                        url: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${name}.png`,
                        responseType: 'stream'
                    }).then(img => {
                        img.data.pipe(fs.createWriteStream(`champions/${name}.png`))
                    })
                )
            }

            jimp.read('Mask.png').then(mask => {
                Promise.all(promises).then(() => {
                    setTimeout(() => {
                        for (i in names) {
                            const name = names[i]
                            jimp.read(`champions/${name}.png`).then(champImg => {
                                champImg.mask(mask, 0, 0).write(`champions/${name}.png`)
                            })
                        }
                    }, 1000)
                })
            })
        })
})