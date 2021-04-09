const fetch = require('node-fetch')
const fs = require('fs')
const jimp = require('jimp')

    ;
(async () => {
    let resp = await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    const versions = await resp.json()
    const version = versions[0]

    resp = await fetch('https://ddragon.leagueoflegends.com/cdn/' + version + '/data/en_US/champion.json')
    const champions = await resp.json()
    const names = Object.keys(champions.data)

    let promises = []
    for (i in names) {
        const name = names[i]
        promises.push(
            fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${name}.png`).then(img => {
                img.body.pipe(fs.createWriteStream(`champions/${name}.png`))
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
})()