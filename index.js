const { Kayn, REGIONS } = require('kayn')
const Discord = require('discord.js')
const Canvas = require('canvas')
const fs = require('fs')
const { rgToken, discordToken } = require('./secrets.json')




const client = new Discord.Client()

client.login(discordToken)

const kayn = Kayn(rgToken)({
    region: REGIONS.EUROPE_WEST
})

client.on('ready', async () => {
    /*
        const summonerName = 'Karj'
        const champions = (await kayn.DDragon.Champion.listDataByIdWithParentAsId()).data
    
        const summoner = await kayn.Summoner.by.name(summonerName)
        const game = await kayn.CurrentGame.by.summonerID(summoner.id)
        let allyTeam = []
        let enemyTeam = []
        //console.log(game)
        const player = game.participants.find(p => p.summonerName == summonerName)
        for (let i = 0; i < game.participants.length; i++) {
            let team = {}
            //console.log(game.participants[i].summonerId)
            let elo = await kayn.League.Entries.by.summonerID(game.participants[i].summonerId)
            let Solo5x5 = elo.find(e => e.queueType == 'RANKED_SOLO_5x5')
            if (Solo5x5) team.elo = Solo5x5.tier + ' ' + Solo5x5.rank
            team.elo = team.elo || "UNRANKED"
            team.name = game.participants[i].summonerName
            team.champion = champions[game.participants[i].championId].name
            team.wins = elo.wnis
            team.losses = elo.losses
            if (game.participants[i].teamId == player.teamId) {
                allyTeam.push(team)
            }
            else {
                enemyTeam.push(team)
            }
        }
        console.log(allyTeam)
        console.log(enemyTeam)
    
        fs.writeFileSync('allyTeam.json', JSON.stringify(allyTeam))
        fs.writeFileSync('enemyTeam.json', JSON.stringify(enemyTeam))
    */

    const allyTeam = require('./allyTeam.json')
    const enemyTeam = require('./enemyTeam.json')

    const canvas = Canvas.createCanvas(700, 300);
    const ctx = canvas.getContext('2d');

    const background = await Canvas.loadImage('./wallpaper.png');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#ffffff';
    for (i = 0; i < allyTeam.length; i++) {
        ctx.fillText(allyTeam[i].champion, 25, i * 50 + 50);
        ctx.fillText(allyTeam[i].elo, 175, i * 50 + 50);

        ctx.fillText(enemyTeam[i].champion, 375, i * 50 + 50);
        ctx.fillText(enemyTeam[i].elo, 525, i * 50 + 50);

    }
    const attachment = new Discord.Attachment(canvas.toBuffer(), 'image.png');

    client.channels.get('647831066228293632').send(attachment)
})





