const fs = require('fs')
const Canvas = require('canvas')
const jsdom = require('jsdom')
const Discord = require('discord.js')
const fetch = require('node-fetch')

let users = require('./users.json')
const config = require('./secrets.json')

Canvas.registerFont('Roboto-Regular.ttf', { family: 'Roboto' })

const { JSDOM } = jsdom;
const client = new Discord.Client({ intents: ['GUILD_PRESENCES', 'GUILD_MESSAGES'] });

const gameStrings = ['In Game', 'Im Spiel', 'En jeu', 'Oyunda']
const server = "euw"
const prefix = '!!'
let recentGames = []

let championsJSON
let versions

client.on('ready', async () => {
    console.log(client.user.tag, 'online')

    let r = await fetch(`https://ddragon.leagueoflegends.com/api/versions.json`)
    versions = await r.json()

    r = await fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/champion.json`)
    championsJSON = await r.json()

})


client.on('raw', async rawPacket => {
    if (rawPacket.t === 'MESSAGE_CREATE') {
        const message = rawPacket.d
        if (message.author.bot) return
        if (message.content.startsWith(prefix)) {
            const args = message.content.split(' ')
            const command = args.shift().slice(prefix.length)
            console.log(command, args)
            switch (command) {
                case 'help':
                    channelSend(message.channel_id, 'No')
                    return
                case 'ping':
                    channelSend(message.channel_id, 'Pong!')
                    return
                case 'test': 
                    fetchPlayer({test: true})
                    return
                case 'update':
                    channelSend(message.channel_id, 'Updating...')
                    require('./downloadImages.js')
                    let r = await fetch(`https://ddragon.leagueoflegends.com/api/versions.json`)
                    versions = await r.json()
                    r = await fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/champion.json`)
                    championsJSON = await r.json()        
                    return        
                case 'add':
                    if (users[message.author.id]) return channelSend(message.channel_id, 'Already in Database as', users[message.author.id])
                    if (args.length == 0) {
                        channelSend(message.channel_id, 'No player name provided')
                        return
                    }
                    const player = args.join(' ')
                    const response = await fetch(`https://www.leagueofgraphs.com/summoner/euw/${player}`)
                    if (response.status == 404) {
                        channelSend(message.channel_id, 'Player not found')
                        return
                    }
                    users[message.author.id] = player
                    fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
                    channelSend(message.channel_id, `${player} added`)
                    return
                case 'remove':
                    console.log(users[message.author.id], message.author.id)
                    if (!users[message.author.id]) return channelSend(message.channel_id, 'User not in Database')
                    channelSend(message.channel_id, `${users[message.author.id]} removed`)
                    delete users[message.author.id]
                    fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
                    return
                case 'trigger':
                    if (!users[message.author.id]) return channelSend(message.channel_id, 'User not in Database')
                    fetchPlayer({player: users[message.author.id], userID: message.author.id})
                    return
            }
        }
    } else if (rawPacket.t === 'PRESENCE_UPDATE') {
        const userID = rawPacket.d.user.id
        const activity = rawPacket.d.activities.find(a => a.name === "League of Legends")
        if (!users[userID]) return
        let player = users[userID]
        if (!activity) return
        if (!activity || !activity.timestamps) return
        if (new Date() - activity.timestamps.start > 10000) return
        if (activity.name != 'League of Legends' || !gameStrings.includes(activity.state)) return
        if (activity.details.includes('Teamfight Tactics')) return
        if (recentGames.includes(player)) return
        console.log("Fetching data for " + player, activity)
        fetchPlayer({player, userID})
    }
})

function channelSend(channel, message) {
    client.channels.fetch(channel).then(ch => ch.send(message))
}

async function fetchPlayer({player, userID, test}) {

    let dom 
    if (!test) {
        dom = await JSDOM.fromURL(`https://porofessor.gg/partial/live-partial/${server}/${encodeURIComponent(player)}`)
    } else {
        dom = await JSDOM.fromFile('prof.html')
    }

    const document = dom.window.document

    // const championsJSON = require('./champions.json')
    let championMapper = {}
    for (key in championsJSON.data) {
        championMapper[championsJSON.data[key].name] = key
    }
    // https://porofessor.gg/partial/live-partial/na/Chaeha
    // const fetch = require('node-fetch')
    // fetch('https://porofessor.gg/live/na/R%C3%ADenfleche').then(resp => resp.text().then(console.log))


    const gameType = document.querySelector('.left.relative').textContent.trim().split('\n')[0] || "?"
    const playerNames = [
        ...[...document.querySelectorAll('.cardHeader.blue a')].map(e => e.textContent.trim()),
        ...[...document.querySelectorAll('.cardHeader.red a')].map(e => e.textContent.trim()),
    ]
    const champions = [...document.querySelectorAll('.championBox .relative img')].map(e => e.alt)
    const winrate = [...document.querySelectorAll('.title.oneLiner')].map(e => e.textContent.trim().split(/\s+/g).map(g => g.replace('(', '').replace(')', '')))
    const ranks = [...document.querySelectorAll('.highBoxHeight.relative > img')].map(e => e.title)
    const rankedGamesRaw = [...document.querySelectorAll('.rankingsBox.canExpand .imgFlex:first-of-type .oneLiner')].map(e => e.textContent.trim().split(/\s+/g))
    const mainRoles = [...document.querySelectorAll('.rolesBox .highlight')].map(e => e.textContent.trim())
    const kda = [...document.querySelectorAll('div.championsBoxContainer > div > div.imgFlex > div.txt > div.content > div:nth-child(1)')].map(e => e.textContent.replace(/\s/g, ''))
    if (recentGames.includes(users[userID]) && !test) return
    recentGames = [...recentGames, ...playerNames]
    setTimeout(() => {
        recentGames = []
    }, 10 * 1000)

    let rankedGames = []
    for (let i = 0; i < ranks.length; i++) {
        if (ranks[i] == "Unranked") {
            rankedGames[i] = null
        } else {
            rankedGames[i] = rankedGamesRaw[i]
        }
    }

    const playerIndex = playerNames.indexOf(player)
    const premades = [...document.querySelectorAll('.premadeTag ')].map(e => ([e.parentNode.children[2] ? e.parentNode.children[1].textContent.trim() : e.parentNode.children[0].textContent.trim(), e.textContent.trim()]))

    const premadeColors = ["#00ff00", '#ff00ff', '#ffff00', '#00ffff', '#ff00ff', '#ffffff']
    let premadeMapper = {}
    for (let i = 0; i < premades.length; i++) {
        premadeMapper[premades[i][0]] = premadeColors[premades[i][1] - 1]
    }

    let indexOffset = false
    if (playerIndex > 4) indexOffset = true

    const canvas = Canvas.createCanvas(700, 300)
    const ctx = canvas.getContext('2d')

    ctx.textAlign = "center"
    ctx.textBaseline = "middle";

    const background = await Canvas.loadImage('./scoreboardatlas.png')
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height)

    ctx.font = 'bold 12px "Roboto"'
    ctx.fillStyle = '#dddddd'
    if (gameType == "ARAM") {
        ctx.fillText('ARAM MMR', 105, 40)
        ctx.fillText('ARAM MMR', 445, 40)
    } else {
        ctx.fillText('Ranked', 105, 40)
        ctx.fillText('Ranked', 445, 40)
    }
    ctx.fillText('Main', 235, 40)
    ctx.fillText('Champion', 300, 40)


    ctx.fillText('Main', 575, 40)
    ctx.fillText('Champion', 640, 40)

    ctx.font = 'bold 20px "Roboto"'
    ctx.fillStyle = '#dddddd'
    ctx.fillText(gameType, canvas.width / 2, 20)

    // Ally
    for (let i = 0; i < 10; i++) {
        const k = i >= 5 ? i - 5 : i
        const j = indexOffset ? (i + 5 >= 10 ? i - 5 : i + 5) : i
        const offset = i >= 5 ? 340 : 0

        if (championMapper[champions[j]]) {
            const heroPic = await Canvas.loadImage(__dirname +
                `/champions/${championMapper[champions[j]]}.png`
            )
            ctx.drawImage(heroPic, 25 + offset, k * 49 + 50, 40, 40)
        }

        // Premade Outlines
        const premadeColor = premadeMapper[playerNames[j]]
        if (premadeColor) {
            ctx.strokeStyle = premadeColor
            ctx.lineWidth = 2
            ctx.beginPath();
            ctx.arc(45 + offset, k * 49 + 70, 20, 0, 2 * Math.PI);
            ctx.stroke();
        }

        let rank = ranks[j].split(' ')

        const eloPic = await Canvas.loadImage(
            __dirname + `/ranked-emblems/${rank[0].toUpperCase()}.png`
        )

        if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(ranks[j].toUpperCase())) {
            ctx.drawImage(eloPic, 160 + offset, k * 49 + 45, 50, 50)
        } else {
            ctx.drawImage(eloPic, 150 + offset, k * 49 + 50, 40, 40)

            ctx.font = 'bold 25px "Roboto"'
            ctx.fillStyle = '#dddddd'
            ctx.fillText(rank[1] || '', 202 + offset, k * 49 + 70)
        }


        if (gameType == "ARAM") {
            const resp = await fetch(`https://euw.whatismymmr.com/api/v1/summoner?name=${encodeURIComponent(playerNames[j])}&v=${Math.floor(Math.random() * 1e6)}`,
                { headers: { "User-Agent": "linux:Matchmaking-Watcher:1.0.0" } })
            const json = await resp.json()
            if (json.ARAM) ctx.fillText(json.ARAM.avg, 460 - 350 + offset, k * 49 + 70)
        } else if (!rankedGames[j]) {
            //ctx.fillText('0 Played', 460 - 350 + offset, k * 49 + 86)
        } else {
            ctx.font = 'bold 15px Calibri'
            const percent = rankedGames[j][1].replace("%", "") / 100
            let color
            if (percent > 0.5) {
                color = Math.min(percent, 0.7) - 0.5
                color = rgbToHex(255 * (0.2 - color) / 0.2, 255, 0)
            }
            else {
                color = 0.5 - Math.max(percent, 0.3)
                color = rgbToHex(255, 255 * (0.2 - color) / 0.2, 0)
            }
            ctx.fillStyle = color
            ctx.fillRect(433 - 350 + offset, k * 49 + 51, 54, 24)
            ctx.font = '900 20px "Roboto"'

            ctx.fillStyle = '#000000'
            ctx.fillText(Math.round(percent * 100) + " %", 460 - 350 + offset, k * 49 + 63)

            ctx.font = 'bold 15px "Roboto"'
            ctx.fillStyle = '#ffffff'
            ctx.fillText(`${rankedGames[j][3].replace('(', '')} ${rankedGames[j][4].replace(')', '')}`, 460 - 350 + offset, k * 49 + 86)
        }

        const rolePic = await Canvas.loadImage(
            __dirname + `/roles/${mainRoles[j].split(',')[0]}.png`
        )
        ctx.drawImage(rolePic, 570 - 350 + offset, k * 49 + 53, 35, 35)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 15px "Roboto"'

        let champWins = winrate[j]
        if (champWins.length == 2) {
            ctx.fillText("0 Played", 650 - 350 + offset, k * 49 + 60)
        } else {
            ctx.fillText(`${champWins[0]} (${champWins[2]})`, 650 - 350 + offset, k * 49 + 60)
        }

        if (kda == "-/-/-") {
            ctx.fillText(kda, 270 + offset, k * 49 + 80)
        }
        else {
            const [kills, deaths, assists] = kda[j].split('/')

            ctx.fillStyle = '#00ff00'
            ctx.fillText(kills, 270 + offset, k * 49 + 80)

            const deathsOffset = 33
            ctx.fillStyle = '#ff0000'
            ctx.fillText(deaths, 270 + offset + deathsOffset, k * 49 + 80)

            const assistsOffset = deathsOffset + 33
            ctx.fillStyle = '#ffff00'
            ctx.fillText(assists, 270 + offset + assistsOffset, k * 49 + 80)

            ctx.fillStyle = '#ffffff'
            ctx.fillText('/', 254 + offset + deathsOffset, k * 49 + 80)
            ctx.fillText('/', 253 + offset + assistsOffset, k * 49 + 80)
        }
    }

    // fs.writeFileSync('img.png', canvas.toBuffer())

    client.channels.fetch('647831066228293632').then(c =>
        c.send({
            files: [{
                attachment: canvas.toBuffer(),
                name: 'image.png'
            }]
        }).then(msg => {
            console.log("Message Sent!")
        }))
}

client.login(config.token)

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
