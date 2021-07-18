const { Client } = require('discord.js'),
    client = new Client({
        fetchAllMembers: false,
    });
const mongoose = require('mongoose');
const config = require("../Gerekli/ayar");
const { Database } = require('ark.db'),
    db = new Database("../Gerekli/data.json");
mongoose.connect('mongo url', { useNewUrlParser: true, useUnifiedTopology: true });
const Databasse = require("./models/role");
const boost = config.boost;
const cezals = config.cezalı;
const emo = config.Embed;

//---Ready Eventi---//
client.on("ready", async => {
    let botVoiceChannel = client.channels.cache.get(config.VOICE);
    if (botVoiceChannel) botVoiceChannel.join().catch(() => console.log("Bot ses kanalına bağlanamadı!"));
    client.user.setPresence(config.durum).catch();
    console.log(`Logged in as ${client.user.tag}!`);
    setRoleBackup();
    setInterval(() => {
        setRoleBackup();
    }, 1000 * 60 * 60 * 3);
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
    if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith("r!")) return;
    if (!config.OWNER.includes(message.author.id)) return;
    let args = message.content.split(' ').slice(1);
    let command = message.content.split(' ')[0].slice("r!".length);

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
    if (command === "kur" || command === "kurulum" || command === "backup" || command === "setup") {
        if (!args[0] || isNaN(args[0])) return message.channel.send("Geçerli bir rol ID'si belirtmelisin!").then(a => a.delete({ timeout: 9000 }));

        Databasse.findOne({ guildID: config.GUILD_ID, roleID: args[0] }, async(err, roleData) => {
            if (!roleData) return message.channel.send("Belirtilen rol ID'sine ait veri bulunamadı!").then(a => a.delete({ timeout: 9000 }));
            message.react("✅");
            let yeniRol = await message.guild.roles.create({
                data: {
                    name: roleData.name,
                    color: roleData.color,
                    hoist: roleData.hoist,
                    permissions: roleData.permissions,
                    position: roleData.position,
                    mentionable: roleData.mentionable
                },
                reason: "Backup atıyom abi"
            });

            setTimeout(() => {
                let kanalPermVeri = roleData.channelOverwrites;
                if (kanalPermVeri) kanalPermVeri.forEach((perm, index) => {
                    let kanal = message.guild.channels.cache.get(perm.id);
                    if (!kanal) return;
                    setTimeout(() => {
                        let yeniKanalPermVeri = {};
                        perm.allow.forEach(p => {
                            yeniKanalPermVeri[p] = true;
                        });
                        perm.deny.forEach(p => {
                            yeniKanalPermVeri[p] = false;
                        });
                        kanal.createOverwrite(yeniRol, yeniKanalPermVeri).catch(console.error);
                    }, index * 5000);
                });
            }, 5000);

            let roleMembers = roleData.members;
            roleMembers.forEach((member, index) => {
                let uye = message.guild.members.cache.get(member);
                if (!uye || uye.roles.cache.has(yeniRol.id)) return;
                setTimeout(() => {
                    uye.roles.add(yeniRol.id).catch(console.error);
                }, index * 3000);
            });
            message.channel.send(`${yeniRol.name} rolünü açma işlemi tamam şimdi yardımcılarım ile yavaş yavaş dağıtılıyor`).then(a => a.delete({ timeout: 9000 }));

        });
    };
});
///////////////////////////////////////////////////////
const widperms = ["ADMINISTRATOR", "KICK_MEMBERS", "MANAGE_GUILD", "BAN_MEMBERS", "MANAGE_ROLES", "MANAGE_WEBHOOKS", "MANAGE_CHANNELS"];
//Ban sexi
client.on("guildBanAdd", async(guild, user) => {
    let entry = await guild.fetchAuditLogs({ type: 'MEMBER_BAN_ADD' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    guild.members.unban(user.id, emo.title).catch();
    penal(entry.executor.id, "ban");
    let uye = entry.executor;
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne \`${user.tag}\` sunucudan banladı banını açtım ${uye} bunada ban attım.**`,
            footer: {
                icon_url: guild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
//Yetki verme sexi
client.on("guildMemberUpdate", async(oldMember, newMember) => {
    let entry = await newMember.guild.fetchAuditLogs({ type: 'MEMBER_ROLE_UPDATE' }).then(x => x.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    if (oldMember.roles.cache.size == newMember.roles.cache.size) return;
    if (widperms.some(x => !oldMember.hasPermission(x) && newMember.hasPermission(x))) {
        penal(entry.executor.id, "jail");
        penal(newMember.id, "jail")
        let uye = entry.executor;
        const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
        if (logkanal) logkanal.send({
            embed: {
                color: emo.color,
                title: emo.title,
                description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne ${newMember} sunucuda yetki verdi ikisinide jaile attım.**`,
                footer: {
                    icon_url: newMember.guild.iconURL({ dynamic: true }),
                    text: emo.footer
                }
            }
        }).catch();
    }
});
//Role update
client.on("roleUpdate", async(oldRole, newRole) => {
    let entry = await newRole.guild.fetchAuditLogs({ type: 'ROLE_UPDATE' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (newRole.guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    newRole.edit({
        color: oldRole.color,
        hoist: oldRole.hoist,
        mentionable: oldRole.mentionable,
        name: oldRole.name,
        permissions: oldRole.permissions,
        position: oldRole.position
    });
    let uye = entry.executor;
    penal(entry.executor.id, "jail");
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne \`${newRole.name}\` rolünü güncelledi ben rolü eski haline çevirip yapanıda jaile attım.**`,
            footer: {
                icon_url: newRole.guild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
//Role create
client.on("roleCreate", async role => {
    let entry = await role.guild.fetchAuditLogs({ type: 'ROLE_CREATE' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (role.guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    role.delete({ reason: `Wid Korudu` })
    penal(entry.executor.id, "jail");
    let uye = entry.executor;
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${uye} (\`${uye.id}\`) **bu ibne \`${role.name}\` rolünü açtı rolü sildim yapanıda jaile attım.**`,
            footer: {
                icon_url: role.guild.iconURL({ dynamic: true }),
                text: emo.footer
            }
        }
    }).catch();
});
//Role delete
client.on("roleDelete", async role => {
    let entry = await role.guild.fetchAuditLogs({ type: 'ROLE_DELETE' }).then(audit => audit.entries.first());
    let wlist = db.get(`wlist.${entry.executor.id}`);
    if (config.OWNER.includes(entry.executor.id)) return;
    if (config.BOT.includes(entry.executor.id)) return;
    if (role.guild.ownerID === entry.executor.id) return;
    if (wlist === "evet") return;
    penal(entry.executor.id, "ban");
    ytsik(role.guild.id);
    let yeniRol = await role.guild.roles.create({
        data: {
            name: role.name,
            color: role.hexColor,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions,
            mentionable: role.mentionable
        },
        reason: "Backup atıyom abi"
    });

    Databasse.findOne({ guildID: role.guild.id, roleID: role.id }, async(err, roleData) => {
        if (!roleData) return;
        setTimeout(() => {
            let kanalPermVeri = roleData.channelOverwrites;
            if (kanalPermVeri) kanalPermVeri.forEach((perm, index) => {
                let kanal = role.guild.channels.cache.get(perm.id);
                if (!kanal) return;
                setTimeout(() => {
                    let yeniKanalPermVeri = {};
                    perm.allow.forEach(p => {
                        yeniKanalPermVeri[p] = true;
                    });
                    perm.deny.forEach(p => {
                        yeniKanalPermVeri[p] = false;
                    });
                    kanal.createOverwrite(yeniRol, yeniKanalPermVeri).catch(console.error);
                }, index * 5000);
            });
        }, 5000);

        let roleMembers = roleData.members;
        roleMembers.forEach((member, index) => {
            let uye = role.guild.members.cache.get(member);
            if (!uye || uye.roles.cache.has(yeniRol.id)) return;
            setTimeout(() => {
                uye.roles.add(yeniRol.id).catch();
            }, index * 3000);
        });
    });
    const logkanal = client.channels.cache.get(config.log.guard) || client.channels.cache.find(x => x.name === "guard-log");
    if (logkanal) logkanal.send({
        embed: {
            color: emo.color,
            title: emo.title,
            description: `🛡 ${entry.executor} (\`${entry.executor.id}\`) **bu ibne \`${role.name}\` rolünü sildi rolü açtım ve geri dağıtıyom yapanı banlayıp sunucudaki yetkileri kapattım**`,
            footer: {
                icon_url: role.guild.iconURL({ dynamic: true }),
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
//Role database
function setRoleBackup() {
    let guild = client.guilds.cache.get(config.GUILD_ID);
    if (guild) {
        guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).forEach(role => {
            let roleChannelOverwrites = [];
            guild.channels.cache.filter(c => c.permissionOverwrites.has(role.id)).forEach(c => {
                let channelPerm = c.permissionOverwrites.get(role.id);
                let pushlanacak = { id: c.id, allow: channelPerm.allow.toArray(), deny: channelPerm.deny.toArray() };
                roleChannelOverwrites.push(pushlanacak);
            });

            Databasse.findOne({ guildID: config.GUILD_ID, roleID: role.id }, async(err, savedRole) => {
                if (!savedRole) {
                    let newRoleSchema = new Databasse({
                        _id: new mongoose.Types.ObjectId(),
                        guildID: config.GUILD_ID,
                        roleID: role.id,
                        name: role.name,
                        color: role.hexColor,
                        hoist: role.hoist,
                        position: role.position,
                        permissions: role.permissions,
                        mentionable: role.mentionable,
                        time: Date.now(),
                        members: role.members.map(m => m.id),
                        channelOverwrites: roleChannelOverwrites
                    });
                    newRoleSchema.save();
                } else {
                    savedRole.name = role.name;
                    savedRole.color = role.hexColor;
                    savedRole.hoist = role.hoist;
                    savedRole.position = role.position;
                    savedRole.permissions = role.permissions;
                    savedRole.mentionable = role.mentionable;
                    savedRole.time = Date.now();
                    savedRole.members = role.members.map(m => m.id);
                    savedRole.channelOverwrites = roleChannelOverwrites;
                    savedRole.save();
                };
            });
        });

        Databasse.find({ guildID: config.GUILD_ID }).sort().exec((err, roles) => {
            roles.filter(r => !guild.roles.cache.has(r.roleID) && Date.now() - r.time > 1000 * 60 * 60 * 24 * 3).forEach(r => {
                Databasse.findOneAndDelete({ roleID: r.roleID });
            });
        });
        console.log(`Yedekleme başarılı şekilde tamamlandı!`);
    };
};
//Discord giriş sikiş ve gereksiz error kapatma
client.login(config.T2).catch(() => console.log("Böyle bir token yok amk malmısın"));

process.on("unhandledRejection", error => {
    //console.error('Unhandled promise rejection:', error);
});