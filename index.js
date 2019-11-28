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
    /*
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
        
            let recent = recents.find(r => r.gameId == game.gameId)
            const particpantSummoner = game.participants.find(p => p.summonerName == summonerName)
            if (recent) {
                recent.champs = champions[particpantSummoner.championId].key
                return
            }
            recents.push({ gameId: gameId, champs: [champions[particpantSummoner.championId].key] })
            setTimeout(() => {
                recents.splice(recents.indexOf(recent), 1)
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
                    team.lp = Solo5x5.leaguePoints
                }
                team.name = game.participants[i].summonerName
                team.champion = champions[game.participants[i].championId].key
        
                let config = {
                    query: 420,
                    champion: game.participants[i].championId,
                    beginIndex: 0
                    //season: season
                }
                const summ = await kayn.Summoner.by.id(game.participants[i].summonerId)
                let collector = 0
                try {
                    let paginate = 0
                    do {
                        let matches = await kayn.Matchlist.by.accountID(summ.accountId).query(config)
                        matches = matches.filter(m => m.season == season)
                        beginIndex = beginIndex + 100
                        collector = collector + matches.matches.length
                    }
                    while (matches.totalGames > collector)
        
                    team.totalGames = matches.totalGames
                    team.champGames = collector
                }
                catch (e) {
                    team.totalGames = 0
                    team.champGames = 0
                }
            }
            if (game.participants[i].teamId == player.teamId) {
                allyTeam.push(team)
            } else {
                enemyTeam.push(team)
            }
        }
            //console.log(allyTeam)
            //console.log(enemyTeam)
        
            * /
            fs.writeFileSync('allyTeam.json', JSON.stringify(allyTeam))
            fs.writeFileSync('enemyTeam.json', JSON.stringify(enemyTeam))
        })
        */
    ; (async () => {
        const allyTeam = require('./allyTeam.json')
        const enemyTeam = require('./enemyTeam.json')
        const version = "9.23.1"

        const canvas = Canvas.createCanvas(700, 300)
        const ctx = canvas.getContext('2d')

        ctx.textAlign = "center";

        const background = await Canvas.loadImage('./scoreboardatlas.png')
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height)

        let heroPic, eloPic
        for (i = 0; i < allyTeam.length; i++) {
            console.log('Rendering row', i)

            heroPic = await Canvas.loadImage(
                `champions/${allyTeam[i].champion}.png`
            )
            ctx.drawImage(heroPic, 25, i * 49 + 50, 40, 40)

            // Green outline
            ctx.strokeStyle = '#5cb85c'
            ctx.beginPath();
            ctx.arc(45, i * 49 + 70, 20, 0, 2 * Math.PI);
            ctx.stroke();

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

                ctx.font = '15px sans-serif'
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
                `champions/${enemyTeam[i].champion}.png`
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
                    `./ranked-emblems/${enemyTeam[i].tier}.png`
                )
                ctx.drawImage(eloPic, 485, i * 49 + 50, 40, 40)

                ctx.font = 'bold 15px Arial'
                ctx.fillStyle = '#dddddd'
                ctx.fillText(enemyTeam[i].rank, 560, i * 49 + 65)
                ctx.font = 'bold 15px Arial'
                ctx.fillText(allyTeam[i].lp + ' LP', 560, i * 49 + 85)


                ctx.font = '20px sans-serif'
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
                ctx.fillRect(423, i * 49 + 56, 50, 30)
                ctx.fillStyle = '#000000'
                ctx.fillText(Math.round(percent * 100) + "%", 450, i * 49 + 79)

                /*ctx.fillStyle = '#5cb85c'
                ctx.fillText(enemyTeam[i].wins, 545, i * 49 + 82)

                ctx.fillStyle = '#d9534f'
                ctx.fillText(enemyTeam[i].losses, 585, i * 49 + 82)
                */

                ctx.fillStyle = '#ffffff'
                ctx.fillText(enemyTeam[i].totalGames, 635, i * 49 + 82)
            } else {
                ctx.font = '30px sans-serif'
                ctx.fillStyle = '#dddddd'
                ctx.fillText('Unranked', 435, i * 49 + 82)
            }
        }
        fs.writeFileSync('img.png', canvas.toBuffer())
    })()

/*

const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'image.png')
client.channels.get('647831066228293632').send(attachment)
})

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

*/

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}