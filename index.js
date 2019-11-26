const { Kayn, REGIONS } = require('kayn')
const Discord = require('discord.js')
const Canvas = require('canvas')
const fs = require('fs')
const axios = require('axios')
const { rgToken, discordToken } = require('./secrets.json')

let users = require('./users.json')
let recents = []

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

    if (activity.name != 'League of Legends' || activity.state != 'In Game') return
    console.log('presenceUpdate check 3')

    if (new Date() - activity.timestamps.start > 60000) return
    console.log('presenceUpdate check 4')


    console.log("Fetching data for " + users[userID])

    const versions = await kayn.DDragon.Version.list()
    const version = versions[0]

    const response = await axios("https://raw.githubusercontent.com/CommunityDragon/Data/master/patches.json", { json: true })
    //const season = response.data.patches[response.data.patches.length - 1].season

    const summonerName = users[userID]
    const champions = (await kayn.DDragon.Champion.listDataByIdWithParentAsId())
        .data

    const summoner = await kayn.Summoner.by.name(summonerName)
    let game = {}
    try {
        game = await kayn.CurrentGame.by.summonerID(summoner.id)
    }
    catch (e) {
        console.error(e)
    }

    if (!game.gameId || recents.includes(game.gameId)) return
    recents.push(game.gameId)
    setTimeout(() => {
        recents.splice(recents.indexOf(game.gameId), 1)
        console.log(recents)
    }, 60000)

    let allyTeam = []
    let enemyTeam = []
    //console.log(game)
    const player = game.participants.find(p => p.summonerName == summonerName)
    for (let i = 0; i < game.participants.length; i++) {
        let team = {}
        console.log(game.participants[i].summonerName)
        let elo = await kayn.League.Entries.by.summonerID(
            game.participants[i].summonerId
        )
        let Solo5x5 = elo.find(e => e.queueType == 'RANKED_SOLO_5x5')
        if (Solo5x5) {
            team.tier = Solo5x5.tier
            team.rank = Solo5x5.rank
            team.wins = Solo5x5.wins
            team.losses = Solo5x5.losses
        }
        team.name = game.participants[i].summonerName
        team.champion = champions[game.participants[i].championId].key

        let config = {
            query: 420,
            champion: game.participants[i].championId,
            //season: season
        }
        const summ = await kayn.Summoner.by.id(game.participants[i].summonerId)
        try {
            const matches = await kayn.Matchlist.by.accountID(summ.accountId).query(config)
            team.totalGames = matches.totalGames
        }
        catch (e) {
            team.totalGames = 0
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
    /*
    const allyTeam = require('./allyTeam.json')
    const enemyTeam = require('./enemyTeam.json')
  */

    const canvas = Canvas.createCanvas(700, 300)
    const ctx = canvas.getContext('2d')

    const background = await Canvas.loadImage('./scoreboardatlas.png')
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height)

    let heroPic, eloPic

    for (i = 0; i < allyTeam.length; i++) {
        console.log('Rendering row', i)
        heroPic = await Canvas.loadImage(
            `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${allyTeam[i].champion}.png`
        )
        ctx.drawImage(heroPic, 25, i * 49 + 50, 40, 40)

        ctx.font = '20px sans-serif'
        ctx.fillStyle = '#5cb85c'
        ctx.fillText('Ranked Wins', 90, 33)

        ctx.fillStyle = '#d9534f'
        ctx.fillText('Ranked Losses', 240, 33)

        ctx.fillStyle = '#ffffff'
        ctx.fillText('Ranked games with champ', 410, 33)

        if (allyTeam[i].rank) {
            eloPic = await Canvas.loadImage(
                `./ranked-emblems/${allyTeam[i].tier}.png`
            )
            ctx.drawImage(eloPic, 85, i * 49 + 50, 40, 40)

            ctx.font = '30px sans-serif'
            ctx.fillStyle = '#dddddd'
            ctx.fillText(allyTeam[i].rank, 150, i * 49 + 82)

            ctx.font = '20px sans-serif'

            ctx.fillStyle = '#5cb85c'
            ctx.fillText(allyTeam[i].wins, 195, i * 49 + 82)

            ctx.fillStyle = '#d9534f'
            ctx.fillText(allyTeam[i].losses, 235, i * 49 + 82)

            ctx.fillStyle = '#ffffff'
            ctx.fillText(allyTeam[i].totalGames, 295, i * 49 + 82)
        } else {
            ctx.font = '30px sans-serif'
            ctx.fillStyle = '#dddddd'
            ctx.fillText('Unranked', 85, i * 49 + 82)
        }

        heroPic = await Canvas.loadImage(
            `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${enemyTeam[i].champion}.png`
        )
        ctx.drawImage(heroPic, 375, i * 49 + 50, 40, 40)

        if (enemyTeam[i].rank) {
            eloPic = await Canvas.loadImage(
                `./ranked-emblems/${enemyTeam[i].tier}.png`
            )
            ctx.drawImage(eloPic, 435, i * 49 + 50, 40, 40)

            ctx.font = '30px sans-serif'
            ctx.fillStyle = '#dddddd'
            ctx.fillText(enemyTeam[i].rank, 500, i * 49 + 82)

            ctx.font = '20px sans-serif'

            ctx.fillStyle = '#5cb85c'
            ctx.fillText(enemyTeam[i].wins, 545, i * 49 + 82)

            ctx.fillStyle = '#d9534f'
            ctx.fillText(enemyTeam[i].losses, 585, i * 49 + 82)

            ctx.fillStyle = '#ffffff'
            ctx.fillText(enemyTeam[i].totalGames, 635, i * 49 + 82)
        } else {
            ctx.font = '30px sans-serif'
            ctx.fillStyle = '#dddddd'
            ctx.fillText('Unranked', 435, i * 49 + 82)
        }
    }
    const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'image.png')

    client.channels.get('647831066228293632').send(attachment)
})

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});