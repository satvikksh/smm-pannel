import { Category, PaymentMethod, PlatformSetting, Service } from '@smm/database';

/**
 * Idempotent seed: default platform settings, categories, sample services and
 * payment methods. Only inserts when the collection is empty.
 */
export async function seedSampleData(): Promise<void> {
  const platformDefaults: Array<[string, unknown]> = [
    ['siteName', 'SMM Panel'],
    ['youtubeLink', 'https://www.youtube.com/@smmpanel'],
    ['telegramLink', 'https://t.me/smmpanel'],
    ['supportEmail', 'support@smmpanel.test'],
    ['currency', 'USD'],
    ['minDeposit', 10],
    ['registrationEnabled', true],
  ];
  for (const [key, value] of platformDefaults) {
    const exists = await PlatformSetting.exists({ key });
    if (!exists) {
      await PlatformSetting.create({ key, value, updatedBy: null });
    }
  }

  const anyCategory = await Category.exists({});
  if (!anyCategory) {
    const cats = await Category.create([
      { name: 'Instagram', slug: 'instagram', icon: 'instagram', status: 'active', sortOrder: 10 },
      { name: 'YouTube', slug: 'youtube', icon: 'youtube', status: 'active', sortOrder: 20 },
      { name: 'Telegram', slug: 'telegram', icon: 'telegram', status: 'active', sortOrder: 30 },
      { name: 'Facebook', slug: 'facebook', icon: 'facebook', status: 'active', sortOrder: 40 },
    ]);

    const likes200 = cats.find((c) => c.slug === 'instagram');
    const sub4 = cats.find((c) => c.slug === 'youtube');
    const members = cats.find((c) => c.slug === 'telegram');

    await Service.create([
      {
        name: 'Instagram Followers',
        categoryId: likes200!._id,
        description: 'High quality Instagram profile followers',
        price: 2.5,
        minOrder: 100,
        maxOrder: 100000,
        status: 'active',
      },
      {
        name: 'Instagram Likes',
        categoryId: likes200!._id,
        description: 'Likes for Instagram posts',
        price: 0.8,
        minOrder: 50,
        maxOrder: 50000,
        status: 'active',
      },
      {
        name: 'YouTube Subscribers',
        categoryId: sub4!._id,
        description: 'YouTube channel subscribers',
        price: 3.2,
        minOrder: 50,
        maxOrder: 50000,
        status: 'active',
      },
      {
        name: 'YouTube Views',
        categoryId: sub4!._id,
        description: 'YouTube video views (high retention)',
        price: 0.35,
        minOrder: 500,
        maxOrder: 200000,
        status: 'active',
      },
      {
        name: 'Telegram Members',
        categoryId: members!._id,
        description: 'Telegram channel members',
        price: 1.9,
        minOrder: 100,
        maxOrder: 50000,
        status: 'active',
      },
    ]);
  }

  const anyPayment = await PaymentMethod.exists({});
  if (!anyPayment) {
    await PaymentMethod.create([
      {
        name: 'Bank Transfer (manual)',
        code: 'bank_transfer',
        enabled: true,
        instructions: 'Transfer the amount to the account shown after submitting. Funds are credited once confirmed.',
        config: { bank: 'Demo Bank', account: '0000-0000' },
      },
      {
        name: 'Crypto (USDT-TRC20)',
        code: 'usdt_trc20',
        enabled: true,
        instructions: 'Send USDT (TRC20) to the wallet address generated on submit.',
        config: { network: 'TRC20' },
      },
    ]);
  }
}