/**
 * Command: kickall
 * System: TOM PRIME X - INSTANT PURGE
 * Author: ToxRon
 */

module.exports = {
    name: 'kickall',
    category: 'owner',
    ownerOnly: true,
    groupOnly: true,
    botAdminNeeded: true,

    async execute(sock, msg, args, { from, reply, isGroup, isBotAdmin }) {
        try {
            // Context & Permission Check
            if (!isGroup) return reply('*[ ᴇʀʀᴏʀ ]* ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ɪs ᴏɴʟʏ ғᴏʀ ɢʀᴏᴜᴘs.');
            if (!isBotAdmin) return reply('*[ ᴅᴇɴɪᴇᴅ ]* ʙᴏᴛ ᴍᴜsᴛ ʙᴇ ᴀɴ ᴀᴅᴍɪɴ ᴛᴏ ᴘᴜʀɢᴇ.');

            const metadata = await sock.groupMetadata(from);
            const participants = metadata.participants;
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            
            // Filter targets (Excluding bot and super-admins)
            const victims = participants
                .filter(p => p.id !== botId && p.admin !== 'superadmin')
                .map(p => p.id);

            if (victims.length === 0) return reply('*[ ɪɴғᴏ ]* ɴᴏ ᴛᴀʀɢᴇᴛs ғᴏᴜɴᴅ.');

            // Initializing Message
            await reply(`*ᴛᴏᴍ ᴘʀɪᴍᴇ x ᴄʟᴇᴀɴ ᴛʜᴇ ɢʀᴏᴜᴘ* 😼🚩\n\n*sᴛᴀᴛᴜs:* ɪɴɪᴛɪᴀʟɪᴢɪɴɢ...\n*ᴛᴀʀɢᴇᴛs:* ${victims.length} ᴍᴇᴍʙᴇʀs\n*ᴍᴏᴅᴇ:* ɪɴsᴛᴀɴᴛ ʙᴜʀsᴛ`);

            const startTime = Date.now();

            // Direct execution (No loops for maximum speed)
            await sock.groupParticipantsUpdate(from, victims, 'remove');

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            // Final Confirmation
            const finalMsg = `*✅ ᴘᴜʀɢᴇ ᴄᴏᴍᴘʟᴇᴛᴇᴅ*\n\n*ᴄʟᴇᴀɴᴇᴅ:* ${victims.length} ᴍᴇᴍʙᴇʀs\n*ᴛɪᴍᴇ:* ${duration}s\n*ʙʏ:* ᴛᴏᴍ ᴘʀɪᴍᴇ x`;

            await reply(finalMsg);

        } catch (err) {
            console.error('[KICKALL ERROR]', err);
            reply('*[ ғᴀᴛᴀʟ ᴇʀʀᴏʀ ]* ᴇxᴇᴄᴜᴛɪᴏɴ ғᴀɪʟᴇᴅ.');
        }
    }
};
