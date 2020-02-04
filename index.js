const { Kayn, REGIONS } = require('kayn')
const Discord = require('discord.js')
const Canvas = require('canvas')
const fs = require('fs')
const axios = require('axios')
const { rgToken, discordToken } = require(__dirname + '/secrets.json')
Canvas.registerFont(__dirname + "/Roboto-Regular.ttf", { family: 'Roboto' })

require(__dirname + '/downloadImages.js')

let users = require(__dirname + '/users.json')
let recents = []

const gameStrings = ['In Game', 'Im Spiel', 'En jeu', 'Oyunda']

const client = new Discord.Client()
const prefix = '!!'
client.login(discordToken)

const kayn = Kayn(rgToken)({
    region: REGIONS.EUROPE_WEST,
})


client.on('ready', async () => {
    console.log(client.user.tag, 'is ready')
})

client.on('message', async message => {
    if (!message.content.startsWith(prefix)) return
    let args = message.content.slice(prefix.length).split(/\s+/)
    const cmd = args.shift()
    if (cmd == "add") {
        if (users[message.author.id] == args.join(' ')) return message.reply('I\'m already monitoring you')
        try {
            const summoner = await kayn.Summoner.by.name(args.join(' '))
            message.reply(`I will monitor the account ${summoner.name}\nLevel: ${summoner.summonerLevel}`)
            users[message.author.id] = args.join(' ')
        }
        catch (e) {
            message.reply('Couldn\'t find the account ' + args.join(' '))
        }
    }
    else if (cmd == "remove") {
        if (users[message.author.id] == null) return message.reply('I\'m not mointoring your account')
        message.reply('I will no longer monitor the account ' + users[message.author.id])
        users[message.author.id] = null
    }
    else {
        return
    }
    console.log(cmd, args.join(' '))
    fs.writeFileSync('users.json', JSON.stringify(users))
})
/*
client.on('message', async m => {
    if (!m.content.startsWith('test')) return
    /*    
})
   */
client.on('raw', async rawPacket => {
    if (rawPacket.t !== 'PRESENCE_UPDATE') return
    const userID = rawPacket.d.user.id
    const activity = rawPacket.d.activities.find(a => a.name === "League of Legends")

    if (!activity) return
    //client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!users[userID]) return
    console.log('presenceUpdate check 1')

    if (!activity || !activity.timestamps) return
    console.log('presenceUpdate check 2')

    if (activity.name != 'League of Legends' || !gameStrings.includes(activity.state)) return
    console.log('presenceUpdate check 3')

    if (new Date() - activity.timestamps.start > 10000) return
    console.log('presenceUpdate check 4')


    console.log("Fetching data for " + users[userID])

    try {
        const summonerName = users[userID]
        const response = await axios("https://raw.githubusercontent.com/CommunityDragon/Data/master/patches.json", { json: true })
        const season = response.data.patches[response.data.patches.length - 1].season
        //const summonerName = 'DeliriousPlayer'

        const champions = (await kayn.DDragon.Champion.listDataByIdWithParentAsId())
            .data

        const summoner = await kayn.Summoner.by.name(summonerName)
        let game = {}
        try {
            game = await kayn.CurrentGame.by.summonerID(summoner.id)
        }
        catch (e) {
            return console.error(e)
        }

        if (!game.gameId || recents.includes(game.gameId)) return
        recents.push(game.gameId)

        let allyTeam = []
        let enemyTeam = []
        //console.log(game)
        const player = game.participants.find(p => p.summonerName == summonerName)

        let elosPromise = []

        for (let i = 0; i < game.participants.length; i++) {
            elosPromise.push(kayn.League.Entries.by.summonerID(
                game.participants[i].summonerId
            ))
        }

        let elos = await Promise.all(elosPromise)
        for (let i = 0; i < game.participants.length; i++) {
            let team = {}
            console.log(game.participants[i].summonerName)
            let elo = elos[i]
            let Solo5x5 = elo.find(e => e.queueType == 'RANKED_SOLO_5x5')
            if (Solo5x5) {
                team.tier = Solo5x5.tier
                team.rank = Solo5x5.rank || "?"
                team.wins = Solo5x5.wins || 0
                team.losses = Solo5x5.losses || 0
                team.lp = Solo5x5.leaguePoints || 0
            }
            team.name = game.participants[i].summonerName
            team.champion = champions[game.participants[i].championId].key

            let config = {
                queue: 420,
                champion: game.participants[i].championId,
                beginIndex: 0
                //season: season
            }
            const summ = await kayn.Summoner.by.id(game.participants[i].summonerId)
            let collector = 0
            try {
                let filteredMatches
                do {
                    let matches = await kayn.Matchlist.by.accountID(summ.accountId).query(config)
                    filteredMatches = matches.matches.filter(m => m.season == season && m.champion == game.participants[i].championId)
                    config.beginIndex = config.beginIndex + 100
                    collector = collector + filteredMatches.length
                    if (filteredMatches.length < 100) break
                }
                while (filteredMatches.length > 100)

                team.champGames = collector
            }
            catch (e) {
                team.champGames = 0
            }
            if (game.participants[i].teamId == player.teamId) {
                allyTeam.push(team)
            } else {
                enemyTeam.push(team)
            }
        }

        //console.log(allyTeam)
        //console.log(enemyTeam)


        fs.writeFileSync('allyTeam.json', JSON.stringify(allyTeam))
        fs.writeFileSync('enemyTeam.json', JSON.stringify(enemyTeam))

        // const allyTeam = require('./allyTeam.json')
        //const enemyTeam = require('./enemyTeam.json')
        //const version = "9.23.1"


        const canvas = Canvas.createCanvas(700, 300)
        const ctx = canvas.getContext('2d')

        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const background = await Canvas.loadImage('./scoreboardatlas.png')
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
        let activeUsers = []
        let heroPic, eloPic

        // Ally
        for (i = 0; i < allyTeam.length; i++) {
            console.log('Rendering row', i)

            heroPic = await Canvas.loadImage(__dirname +
                `/champions/${allyTeam[i].champion}.png`
            )
            ctx.drawImage(heroPic, 25, i * 49 + 50, 40, 40)

            // Green outline
            ctx.strokeStyle = '#5cb85c'
            ctx.lineWidth = 2
            for (discordId in users) {
                if (users[discordId] == allyTeam[i].name) {
                    ctx.strokeStyle = '#ffff00'
                    activeUsers.push(discordId)
                }
            }


            ctx.beginPath();
            ctx.arc(45, i * 49 + 70, 20, 0, 2 * Math.PI);
            ctx.stroke();

            /*
            ctx.font = '20px "Roboto"'
            ctx.fillStyle = '#5cb85c'
            ctx.fillText('Ranked Wins', 90, 33)
    
            ctx.fillStyle = '#d9534f'
            ctx.fillText('Ranked Losses', 240, 33)
    
            ctx.fillStyle = '#ffffff'
            ctx.fillText('Ranked games with champ', 410, 33)
            */

            if (allyTeam[i].rank) {
                eloPic = await Canvas.loadImage(
                    __dirname + `/ranked-emblems/${allyTeam[i].tier}.png`
                )

                ctx.drawImage(eloPic, 515 - 350, i * 49 + 48, 45, 45)
                ctx.font = 'bold 20px "Roboto"'
                ctx.fillStyle = '#dddddd'
                ctx.fillText(allyTeam[i].rank, 590 - 350, i * 49 + 65)
                ctx.font = 'bold 15px "Roboto"'
                ctx.fillText(allyTeam[i].lp + ' LP', 590 - 350, i * 49 + 85)


                ctx.font = 'bold 15px Calibri'
                const percent = Math.round(allyTeam[i].wins / (allyTeam[i].wins + allyTeam[i].losses) * 100) / 100
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
                ctx.fillRect(433 - 350, i * 49 + 51, 54, 24)
                ctx.font = '900 20px "Roboto"'

                ctx.fillStyle = '#000000'
                ctx.fillText(Math.round(percent * 100) + " %", 460 - 350, i * 49 + 63)

                ctx.font = 'bold 15px "Roboto"'
                ctx.fillStyle = '#ffffff'
                ctx.fillText(allyTeam[i].wins + allyTeam[i].losses + " Games", 460 - 350, i * 49 + 86)

                ctx.fillStyle = '#ffffff'

                let champPercent = allyTeam[i].champGames / (allyTeam[i].losses + allyTeam[i].wins) * 100
                ctx.fillText(Math.round(champPercent) + " %", 655 - 350, i * 49 + 65)
                ctx.fillText(allyTeam[i].champGames, 655 - 350, i * 49 + 85)
            } else {
                ctx.font = '30px "Roboto"'
                ctx.fillStyle = '#dddddd'
                ctx.fillText('Unranked', 545 - 350, i * 49 + 75)
            }
        }

        // Enemy
        for (i = 0; i < enemyTeam.length; i++) {

            heroPic = await Canvas.loadImage(__dirname +
                `/champions/${enemyTeam[i].champion}.png`
            )
            ctx.drawImage(heroPic, 375, i * 49 + 50, 40, 40)

            // Red outline
            ctx.strokeStyle = '#d9534f'
            ctx.lineWidth = 2
            ctx.beginPath();
            ctx.arc(395, i * 49 + 70, 20, 0, 2 * Math.PI);
            ctx.stroke();

            if (enemyTeam[i].rank) {
                eloPic = await Canvas.loadImage(
                    __dirname + `/ranked-emblems/${enemyTeam[i].tier}.png`
                )

                ctx.drawImage(eloPic, 515, i * 49 + 48, 45, 45)
                ctx.font = 'bold 20px "Roboto"'
                ctx.fillStyle = '#dddddd'
                ctx.fillText(enemyTeam[i].rank, 590, i * 49 + 65)
                ctx.font = 'bold 15px "Roboto"'
                ctx.fillText(enemyTeam[i].lp + ' LP', 590, i * 49 + 85)


                ctx.font = 'bold 15px Calibri'
                const percent = Math.round(enemyTeam[i].wins / (enemyTeam[i].wins + enemyTeam[i].losses) * 100) / 100
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
                ctx.fillRect(433, i * 49 + 51, 54, 24)
                ctx.font = '900 20px "Roboto"'

                ctx.fillStyle = '#000000'
                ctx.fillText(Math.round(percent * 100) + " %", 460, i * 49 + 63)

                ctx.font = 'bold 15px "Roboto"'
                ctx.fillStyle = '#ffffff'
                ctx.fillText(enemyTeam[i].wins + enemyTeam[i].losses + " Games", 460, i * 49 + 86)


                /*ctx.fillStyle = '#5cb85c'
                ctx.fillText(enemyTeam[i].wins, 545, i * 49 + 82)
        
                ctx.fillStyle = '#d9534f'
                ctx.fillText(enemyTeam[i].losses, 585, i * 49 + 82)
                */

                ctx.fillStyle = '#ffffff'

                let champPercent = enemyTeam[i].champGames / (enemyTeam[i].losses + enemyTeam[i].wins) * 100
                ctx.fillText(Math.round(champPercent) + " %", 655, i * 49 + 65)
                ctx.fillText(enemyTeam[i].champGames, 655, i * 49 + 85)
            } else {
                ctx.font = '30px "Roboto"'
                ctx.fillStyle = '#dddddd'
                ctx.fillText('Unranked', 545, i * 49 + 75)
            }
        }
        fs.writeFileSync('img.png', canvas.toBuffer())

        let mentionString = activeUsers.map(a => '<@' + a + '>').join(' ')
        const attachment = new Discord.MessageAttachment()

        client.channels.get('647831066228293632').send(mentionString, {
            files: [{
                attachment: canvas.toBuffer(),
                name: 'image.png'
            }]
        }).then(msg => {
            console.log("Message Sent!")
        })
    }
    catch (e) {
        console.error("Error", e)
        client.channels.get('647831066228293632').send("Loggo you fucked up bcs:\n`" + require('util').inspect(e) + '`')
    }
})

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}