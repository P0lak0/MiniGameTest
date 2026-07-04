#!/usr/bin/env node
/**
 * Text RPG — простенькая текстовая RPG для консоли.
 * Запуск: node game.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ------------------------- Состояние игрока -------------------------

const player = {
  name: 'Герой',
  level: 1,
  hp: 30,
  maxHp: 30,
  attack: 5,
  defense: 2,
  exp: 0,
  expToNext: 20,
  gold: 10,
  inventory: [],
  location: 'village',
};

// ------------------------- Предметы -------------------------

const items = {
  potion: { name: 'Зелье лечения', heal: 15, price: 8 },
  sword: { name: 'Стальной меч', attackBonus: 4, price: 25 },
  shield: { name: 'Деревянный щит', defenseBonus: 3, price: 20 },
};

// ------------------------- Монстры -------------------------

function createMonster(location) {
  const monsters = {
    forest: { name: 'Дикий волк', hp: 18, attack: 4, defense: 1, expReward: 10, goldReward: 5 },
    cave: { name: 'Пещерный гоблин', hp: 28, attack: 6, defense: 2, expReward: 18, goldReward: 12 },
    ruins: { name: 'Древний страж', hp: 45, attack: 9, defense: 4, expReward: 35, goldReward: 25 },
  };
  const base = monsters[location];
  return { ...base, maxHp: base.hp };
}

// ------------------------- Локации -------------------------

const locations = {
  village: {
    title: 'Деревня Тихий Лог',
    description: 'Ты стоишь на площади маленькой деревни. Тут есть лавка торговца и таверна для отдыха.',
    options: [
      { key: '1', label: 'Идти в лес', action: () => goTo('forest') },
      { key: '2', label: 'Идти к пещере', action: () => goTo('cave') },
      { key: '3', label: 'Идти к древним руинам', action: () => goTo('ruins') },
      { key: '4', label: 'Зайти в лавку торговца', action: () => openShop() },
      { key: '5', label: 'Отдохнуть в таверне (восстановить HP, 5 золота)', action: rest },
      { key: '6', label: 'Проверить персонажа', action: showStatus },
      { key: '0', label: 'Выйти из игры', action: quitGame },
    ],
  },
  forest: {
    title: 'Тёмный лес',
    description: 'Деревья закрывают солнце. Слышен вой волков.',
    options: [
      { key: '1', label: 'Исследовать дальше (возможна встреча с врагом)', action: () => encounter('forest') },
      { key: '2', label: 'Вернуться в деревню', action: () => goTo('village') },
      { key: '3', label: 'Проверить персонажа', action: showStatus },
    ],
  },
  cave: {
    title: 'Мрачная пещера',
    description: 'Сырые стены, капает вода. Где-то впереди рычание.',
    options: [
      { key: '1', label: 'Идти вглубь (возможна встреча с врагом)', action: () => encounter('cave') },
      { key: '2', label: 'Вернуться в деревню', action: () => goTo('village') },
      { key: '3', label: 'Проверить персонажа', action: showStatus },
    ],
  },
  ruins: {
    title: 'Древние руины',
    description: 'Полуразрушенные колонны хранят древнюю магию. Здесь опасно.',
    options: [
      { key: '1', label: 'Идти к центру руин (сильный враг)', action: () => encounter('ruins') },
      { key: '2', label: 'Вернуться в деревню', action: () => goTo('village') },
      { key: '3', label: 'Проверить персонажа', action: showStatus },
    ],
  },
};

// ------------------------- Утилиты вывода -------------------------

function print(text = '') {
  console.log(text);
}

function divider() {
  print('----------------------------------------');
}

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ------------------------- Игровая логика -------------------------

function getTotalAttack() {
  let bonus = 0;
  for (const item of player.inventory) {
    if (item.attackBonus) bonus += item.attackBonus;
  }
  return player.attack + bonus;
}

function getTotalDefense() {
  let bonus = 0;
  for (const item of player.inventory) {
    if (item.defenseBonus) bonus += item.defenseBonus;
  }
  return player.defense + bonus;
}

function showStatus() {
  divider();
  print(`Имя: ${player.name}   Уровень: ${player.level}`);
  print(`HP: ${player.hp}/${player.maxHp}`);
  print(`Атака: ${getTotalAttack()}   Защита: ${getTotalDefense()}`);
  print(`Опыт: ${player.exp}/${player.expToNext}`);
  print(`Золото: ${player.gold}`);
  const invNames = player.inventory.length
    ? player.inventory.map((i) => i.name).join(', ')
    : 'пусто';
  print(`Инвентарь: ${invNames}`);
  divider();
  return mainLoop();
}

function rest() {
  if (player.gold < 5) {
    print('У тебя недостаточно золота, чтобы отдохнуть в таверне.');
    return mainLoop();
  }
  player.gold -= 5;
  player.hp = player.maxHp;
  print('Ты отдохнул и полностью восстановил здоровье. (-5 золота)');
  return mainLoop();
}

function goTo(locationKey) {
  player.location = locationKey;
  return mainLoop();
}

async function openShop() {
  divider();
  print('Лавка торговца. Твоё золото: ' + player.gold);
  print(`1) ${items.potion.name} — ${items.potion.price} золота (лечит ${items.potion.heal} HP)`);
  print(`2) ${items.sword.name} — ${items.sword.price} золота (+${items.sword.attackBonus} к атаке)`);
  print(`3) ${items.shield.name} — ${items.shield.price} золота (+${items.shield.defenseBonus} к защите)`);
  print('0) Уйти');
  const choice = await ask('Что купить? ');

  const map = { '1': 'potion', '2': 'sword', '3': 'shield' };
  const key = map[choice.trim()];

  if (!key) {
    return mainLoop();
  }

  const item = items[key];
  if (player.gold < item.price) {
    print('Недостаточно золота!');
    return openShop();
  }

  player.gold -= item.price;
  player.inventory.push(item);
  print(`Ты купил: ${item.name}`);
  return openShop();
}

async function encounter(locationKey) {
  const monster = createMonster(locationKey);
  print(`На тебя напал(а) ${monster.name}!`);
  return battle(monster, locationKey);
}

async function battle(monster, returnLocation) {
  divider();
  print(`${monster.name}: HP ${monster.hp}/${monster.maxHp}`);
  print(`${player.name}: HP ${player.hp}/${player.maxHp}`);
  print('1) Атаковать');
  print('2) Использовать зелье лечения');
  print('3) Сбежать');

  const choice = (await ask('Твой выбор: ')).trim();

  if (choice === '1') {
    const dmgToMonster = Math.max(1, getTotalAttack() - monster.defense + rand(-1, 2));
    monster.hp -= dmgToMonster;
    print(`Ты наносишь ${dmgToMonster} урона.`);

    if (monster.hp <= 0) {
      return winBattle(monster, returnLocation);
    }

    const dmgToPlayer = Math.max(1, monster.attack - getTotalDefense() + rand(-1, 2));
    player.hp -= dmgToPlayer;
    print(`${monster.name} наносит тебе ${dmgToPlayer} урона.`);

    if (player.hp <= 0) {
      return gameOver();
    }

    return battle(monster, returnLocation);
  }

  if (choice === '2') {
    const potionIndex = player.inventory.findIndex((i) => i === items.potion);
    if (potionIndex === -1) {
      print('У тебя нет зелий лечения!');
      return battle(monster, returnLocation);
    }
    player.inventory.splice(potionIndex, 1);
    player.hp = Math.min(player.maxHp, player.hp + items.potion.heal);
    print(`Ты выпил зелье и восстановил здоровье. HP: ${player.hp}/${player.maxHp}`);

    const dmgToPlayer = Math.max(1, monster.attack - getTotalDefense() + rand(-1, 2));
    player.hp -= dmgToPlayer;
    print(`${monster.name} наносит тебе ${dmgToPlayer} урона.`);

    if (player.hp <= 0) {
      return gameOver();
    }

    return battle(monster, returnLocation);
  }

  if (choice === '3') {
    const escapeChance = Math.random();
    if (escapeChance > 0.4) {
      print('Тебе удалось сбежать!');
      return goTo('village');
    } else {
      print('Побег не удался!');
      const dmgToPlayer = Math.max(1, monster.attack - getTotalDefense());
      player.hp -= dmgToPlayer;
      print(`${monster.name} наносит тебе ${dmgToPlayer} урона.`);
      if (player.hp <= 0) {
        return gameOver();
      }
      return battle(monster, returnLocation);
    }
  }

  print('Неверный выбор.');
  return battle(monster, returnLocation);
}

function winBattle(monster, returnLocation) {
  print(`Ты победил ${monster.name}!`);
  player.exp += monster.expReward;
  player.gold += monster.goldReward;
  print(`Получено опыта: ${monster.expReward}, золота: ${monster.goldReward}`);

  while (player.exp >= player.expToNext) {
    levelUp();
  }

  return goTo(returnLocation === 'village' ? 'village' : returnLocation);
}

function levelUp() {
  player.exp -= player.expToNext;
  player.level += 1;
  player.expToNext = Math.round(player.expToNext * 1.5);
  player.maxHp += 10;
  player.hp = player.maxHp;
  player.attack += 2;
  player.defense += 1;
  print(`>>> Уровень повышен! Теперь ты ${player.level} уровня. <<<`);
}

function gameOver() {
  divider();
  print('Ты пал в бою... Игра окончена.');
  print(`Ты достиг ${player.level} уровня с ${player.gold} золота.`);
  divider();
  rl.close();
  process.exit(0);
}

function quitGame() {
  print('Спасибо за игру! До встречи.');
  rl.close();
  process.exit(0);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ------------------------- Главный цикл -------------------------

async function mainLoop() {
  const loc = locations[player.location];
  divider();
  print(loc.title);
  print(loc.description);
  divider();
  loc.options.forEach((opt) => print(`${opt.key}) ${opt.label}`));

  const choice = (await ask('Твой выбор: ')).trim();
  const selected = loc.options.find((opt) => opt.key === choice);

  if (!selected) {
    print('Неверный выбор, попробуй снова.');
    return mainLoop();
  }

  return selected.action();
}

// ------------------------- Старт -------------------------

async function start() {
  print('========================================');
  print('       ТЕКСТОВАЯ RPG: ЗЕМЛИ ТИХОГО ЛОГА');
  print('========================================');
  const name = await ask('Как зовут твоего героя? ');
  if (name.trim()) {
    player.name = name.trim();
  }
  print(`Добро пожаловать, ${player.name}! Твоё приключение начинается...`);
  return mainLoop();
}

start();
