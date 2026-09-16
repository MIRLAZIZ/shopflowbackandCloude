import { Update, Start, Ctx, On, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotSession } from '../../common/interface/telegram.interface';
import { UserService } from 'src/meta-user/user.service';
import { Role } from 'common/enums/role.enum';

interface MyContext extends Context {
  session: BotSession;
}

@Update()
export class TelegramUpdate {
  constructor(private readonly userService: UserService) { }

  @Start()
  async onStart(@Ctx() ctx: MyContext) {

    ctx.session.waitingForUsername = true;
    ctx.session.startedAt = Date.now(); // 🔥 SHU YO‘Q EDI
    await ctx.reply(
      'Botga xush kelibsiz ✅ \nDasturdagi user nomingizni kiriting:'
    );
  }


  @Command('connect')
  async onConnect(@Ctx() ctx: MyContext) {



    if (ctx.chat?.type !== 'group' && ctx.chat?.type !== 'supergroup') {
      await ctx.reply('❌ Bu buyruq faqat guruhda ishlaydi');
      return;
    }

    const telegramId = ctx.from?.id;
    

    const user = await this.userService.findByTelegramId(telegramId as number);

    if (!user) {
      await ctx.reply('❌ Avval shaxsiy chatda /start bosib username kiriting');
      return;
    }

    if (user.role !== Role.Client) {
      await ctx.reply('❌ Faqat admin guruhni bog‘lashi mumkin');
      return;
    }

    const groupId = ctx.chat.id;
    if(user.telegramGroupId && user.telegramGroupId === String(groupId)){
      await ctx.reply(' ⚠ Ushbu guruh oldinroq biriktirilgan');
      return
    }
    

    
    await this.userService.saveTelegramGroupId(user, groupId);


    await ctx.reply('✅ Guruh admin bilan biriktirildi');
  }


  @On('text')
  async onText(@Ctx() ctx: MyContext) {


    if (!ctx.message || !('text' in ctx.message)) return;

    // commandlarni o'tkazib yuboramiz
    if (ctx.message.text.startsWith('/')) return;

    // faqat private
    if (ctx.chat?.type !== 'private') return;

    if (!ctx.session.waitingForUsername) return;

    // 👇 ENG MUHIM JOY
    if (!ctx.session.startedAt) return;

    // message date sekundda keladi
    const messageTime = ctx.message.date * 1000;

    if (messageTime < ctx.session.startedAt) return;

    const enteredUsername = ctx.message.text.trim();
    const telegramId = ctx.from?.id;

    const user = await this.userService.findByUsername(enteredUsername);

if (!user || (user.role !== Role.Admin && user.role !== Role.Client)) {     
   await ctx.reply('❌ Siz admin emassiz yoki username noto‘g‘ri');
      return;
    }

    if (user.telegramId) {
      await ctx.reply('Siz oldinroq admin sifatida ulangansiz.');
      ctx.session.waitingForUsername = false;
      return;
    }

    await this.userService.saveTelegramId(user, telegramId as number);

    ctx.session.waitingForUsername = false;

    await ctx.reply(
      '✅ Admin sifatida ulandingiz.\nEndi guruhga botni qo‘shib, /connect yozing.'
    );
  }






}