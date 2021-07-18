const { Client } = require('discord.js'),
    client = new Client({
        fetchAllMembers: false,
    });
const request = require("request");
const config = require("../Gerekli/ayar");
const { Database } = require('ark.db'),
    db = new Database("../Gerekli/data.json");
const boost = config.boost;
const cezals = config.cezalı;
const emo = config.Embed;

//---Ready Eventi---//
client.on("ready", async => {
    let botVoiceChannel = client.channels.cache.get(config.VOICE);
    if (botVoiceChannel) botVoiceChannel.join().catch(() => console.log("Bot ses kanalına bağlanamadı!"));
    client.user.setPresence(config.durum).catch();
    console.log(`Logged in as ${client.user.tag}!`);
});
client.on('voiceStateUpdate', async(___, newState) => {
    if (
        newState.member.user.bot &&
        newState.channelID &&
        newState.member.user.id == client.user.id &&
        !newState.selfDeaf
    ) {
        newState.setSelfDeaf(true);
    }
});
client.on('voiceStateUpdate', async(___, newState) => {
    if (
        newState.member.user.bot &&
        newState.channelID &&
        newState.member.user.id == client.user.id &&
        !newState.selfMute
    ) {
        newState.setSelfMute(true);
    }
});
client.on("ready", async() => {
    setInterval(() => {
        request({ url: `https://discord.com/api/v8/guilds/${config.GUILD_ID}/vanity-url`, method: "PATCH", json: { code: "901" }, headers: { "Authorization": `Bot ${config.T3}` }, });
    }, 1 * 1000)
});
client.on("message", async message => {
    if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith("s!")) return;
    if (!config.OWNER.includes(message.author.id)) return;
    let args = message.content.split(' ').slice(1);
    let command = message.content.split(' ')[0].slice("s!".length);

    if (command === "eval") {
        if (!args[0]) return message.channel.send(`Kod belirtilmedi`).then(a => a.delete({ timeout: 9000 }));
        let code = args.join(' ');

        function clean(text) {
            if (typeof text !== 'string') text = require('util').inspect(text, { depth: 0 })
            text = text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203))
            return text;
        };
        try {
            var evaled = clean(await eval(code));
            if (evaled.match(new RegExp(`${client.token}`, 'g'))) evaled.replace(client.token, "Yasaklı komut");
            message.channel.send(`${evaled.replace(client.token, "Yasaklı komut")}`, { code: "js", split: true }).then(a => a.delete({ timeout: 9000 }));
        } catch (err) { message.channel.send(err, { code: "js", split: true }) };
    };
});
///////////////////////////////////////////////////////
//Sunucu update ve ozel url
client.on("guildUpdate", async(oldGuild, newGuild) => {
    let entry = await newGuild.fetchAuditLogs({ type: 'GUILD_UPDATE' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (newGuild.vanityURLCode === null) return;
    if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (newGuild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    penal(entry.executor.id, "ban");
    ytsik(newGuild.id)
    request({
        method: 'PATCH',
        url: `https://discord.com/api/v8/guilds/${newGuild.id}/vanity-url`,
        body: {
            code: '901'
        },
        json: true,
        headers: {
            "Authorization": `Bot ${config.T3}`
        }
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
    });
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    let uye = entry.executor;
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **bu hakiki orusbu evladı özel url değiştirmeye kalktı ve banladım bütün yetkileri kapattım!**`,
            footer: {
                icon_url: newGuild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
client.on("guildUpdate", async(oldGuild, newGuild) => {
    let entry = await newGuild.fetchAuditLogs({ type: 'GUILD_UPDATE' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (newGuild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    penal(entry.executor.id, "jail");
    await newGuild.edit({
        name: oldGuild.name,
        icon: oldGuild.iconURL({ dynamic: true }),
        banner: oldGuild.bannerURL(),
        region: oldGuild.region,
        verificationLevel: oldGuild.verificationLevel,
        explicitContentFilter: oldGuild.explicitContentFilter,
        afkChannel: oldGuild.afkChannel,
        systemChannel: oldGuild.systemChannel,
        afkTimeout: oldGuild.afkTimeout,
        rulesChannel: oldGuild.rulesChannel,
        publicUpdatesChannel: oldGuild.publicUpdatesChannel,
        preferredLocale: oldGuild.preferredLocale
    });
    let uye = entry.executor;
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **Bu ibne sunucu ayarları ile oynadı ve jaile attım!**`,
            footer: {
                icon_url: newGuild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
//Yetkileri sik yani kapat xd
function ytsik(guildID) {
    let sunucu = client.guilds.cache.get(guildID);
    if (!sunucu) return;
    sunucu.roles.cache.filter(r => r.editable && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_GUILD") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_WEBHOOKS"))).forEach(async r => {
        await r.setPermissions(0);
    });
};
//Cezalandırma
function penal(kisiID, type) {
    let uye = client.guilds.cache.get(config.GUILD_ID).members.cache.get(kisiID);
    if (!uye) return;
    if (type == "jail") return uye.roles.cache.has(boost) ? uye.roles.set([boost, cezals]) : uye.roles.set([cezals]);
    if (type == "ban") return uye.ban({ reason: emo.title }).catch();
};
//Discord giriş sikiş ve gereksiz error kapatma
client.login(config.T3).catch(() => console.log("Böyle bir token yok amk malmısın"));

process.on("unhandledRejection", error => {
    //console.error('Unhandled promise rejection:', error);
});