const { Client } = require('discord.js'),
    client = new Client({
        fetchAllMembers: false,
    });
const config = require("../Gerekli/ayar");
const { Database } = require('ark.db'),
    db = new Database("../Gerekli/data.json");
const boost = config.boost;
const cezals = config.cezalı;
const emo = config.Embed;
client.db = db;

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
client.on("message", async message => {
    if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith("k!")) return;
	if(!config.OWNER.includes(message.author.id)) return;
    let args = message.content.split(' ').slice(1);
    let command = message.content.split(' ')[0].slice("k!".length);

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
    if (command === "wladd") {
        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.channel.send("White liste eklencek üyeyi belirtmedin!").then(a => a.delete({ timeout: 9000 }));
        let wid = db.get(`wlist.${member.id}`);
        if (wid === "evet") return message.channel.send("White liste eklenmiş zaten!").then(a => a.delete({ timeout: 9000 }));
        db.set(`wlist.${member.id}`, "evet");
        message.channel.send(`${member} **white liste eklendi!**`).then(a => a.delete({ timeout: 9000 }));
    };
    if (command === "wlremove") {
        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return message.channel.send("White liste silinecek üyeyi belirtmedin!").then(a => a.delete({ timeout: 9000 }));
        let wid = db.get(`wlist.${member.id}`);
        if (!wid === "evet") return message.channel.send("White liste eklenmemiş zaten!").then(a => a.delete({ timeout: 9000 }));
        db.delete(`wlist.${member.id}`);
        message.channel.send(`${member} **white liste silindi!**`).then(a => a.delete({ timeout: 9000 }));
    };
	    if (command === "wliste") {
let eko = message.guild.members.cache.filter(x => db.get(`wlist.${x.id}`) === "evet");
        message.channel.send({embed: {
			title: "White liste ekli olanlar",
			description: `${eko.map(z => `${z}`).join("\n") || "0"}`
		}});
    };
});
///////////////////////////////////////////////////////
// Kanal update
client.on("channelUpdate", async(oldChannel, newChannel) => {
    let entry = await newChannel.guild.fetchAuditLogs({ type: 'CHANNEL_UPDATE' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (newChannel.guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    if (newChannel.type !== "category" && newChannel.parentID !== oldChannel.parentID) newChannel.setParent(oldChannel.parentID);
    if (newChannel.type === "category") {
        newChannel.edit({
            name: oldChannel.name,
        });
    } else if (newChannel.type === "text") {
        newChannel.edit({
            name: oldChannel.name,
            topic: oldChannel.topic,
            nsfw: oldChannel.nsfw,
            rateLimitPerUser: oldChannel.rateLimitPerUser
        });
    } else if (newChannel.type === "voice") {
        newChannel.edit({
            name: oldChannel.name,
            bitrate: oldChannel.bitrate,
            userLimit: oldChannel.userLimit,
        });
    };
    oldChannel.permissionOverwrites.forEach(perm => {
        let thisPermOverwrites = {};
        perm.allow.toArray().forEach(p => {
            thisPermOverwrites[p] = true;
        });
        perm.deny.toArray().forEach(p => {
            thisPermOverwrites[p] = false;
        });
        newChannel.createOverwrite(perm.id, thisPermOverwrites);
    });
    let uye = entry.executor;
    penal(entry.executor.id, "jail")
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne \`${newChannel.name}\` kanalıyla oynadı ben kanalı eski haline getirdim ${uye} bunuda jail attım jail bile azda neyse.**`,
            footer: {
                icon_url: newChannel.guild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
//Kanal create
client.on("channelCreate", async channel => {
    let entry = await channel.guild.fetchAuditLogs({ type: 'CHANNEL_CREATE' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (channel.guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    channel.delete({ reason: emo.title });
    let uye = entry.executor;
    penal(entry.executor.id, "jail")
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne \`${channel.name}\` kanalı açtı ben kanalı sildim ${uye} bunuda jail attım jail bile azda neyse.**`,
            footer: {
                icon_url: channel.guild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
//Kanal delete
client.on("channelDelete", async channel => {
    let entry = await channel.guild.fetchAuditLogs({ type: 'CHANNEL_DELETE' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (channel.guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    penal(entry.executor.id, "ban");
    ytsik(entry.guild.id);
    await channel.clone({ reason: emo.title }).then(async kanal => {
        if (channel.parentID != null) await kanal.setParent(channel.parentID);
        await kanal.setPosition(channel.position);
        if (channel.type == "category") await channel.guild.channels.cache.filter(k => k.parentID == channel.id).forEach(x => x.setParent(kanal.id));
    });
    let uye = entry.executor;
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne \`${channel.name}\` kanalı sildi ben kanalı geri açtım ${uye} bunada ban attım ve rollerin yetkilerini kapattım.**`,
            footer: {
                icon_url: channel.guild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
//Kick
client.on("guildMemberRemove", async member => {
    if (member.user.bot) return;
    let entry = await member.guild.fetchAuditLogs({ type: 'MEMBER_KICK' }).then(audit => audit.entries.first());
    if (member.id !== entry.target.id) return;
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (member.guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    let uye = entry.executor;
    penal(entry.executor.id, "jail");
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne \`${member.user.tag}\` sunucudan tekmeledi ${uye} bunuda jail attım jail bile azda neyse.**`,
            footer: {
                icon_url: member.guild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
//Bot add
client.on("guildMemberAdd", async member => {
    if (member.user.bot) {
        let entry = await member.guild.fetchAuditLogs({ type: 'BOT_ADD' }).then(audit => audit.entries.first());
        let wlist = db.get(`wlist.${entry.executor.id}`);
        if (config.OWNER.includes(entry.executor.id)) return;
        if (config.BOT.includes(entry.executor.id)) return;
        if (member.guild.ownerID === entry.executor.id) return;
        if (wlist === "evet") return;
        penal(member.id, "ban");
        penal(entry.executor.id, "jail");
        let uye = entry.executor;
        const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
        if (logkanal) logkanal.send({
            embed: {
                color: emo.color,
                title: emo.title,
                description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne \`${member.user.tag}\` botu ekledi botu banladım ${uye} bunuda jail attım jail bile azda neyse.**`,
                footer: {
                    icon_url: member.guild.iconURL({ dynamic: true }),
                    text: emo.footer
                }
            }
        }).catch();
    }
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
client.login(config.T1).catch(() => console.log("Böyle bir token yok amk malmısın"));

process.on("unhandledRejection", error => {
    //console.error('Unhandled promise rejection:', error);
});