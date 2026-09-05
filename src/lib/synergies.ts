export interface Faction {
  id: string;
  name: string;
  members: string[];
  isInstantWin?: boolean;
  isPureDBonus?: boolean;
}

export interface CardResult {
  name: string;
  basePower: number;
  boostPercent: number;
  finalPower: number;
}

// Dictionnaire de puissance des 52 personnages
export const CHARACTER_POWER: Record<string, number> = {
  // Légendes & Divinités
  'Imu': 100,
  'JoyBoy': 100,
  'Xebec': 96,
  'Roger': 95,
  'Barbe Blanche': 95,
  'Garp': 95,

  'Shanks': 93,
  'Kaido': 92,
  'Monkey D Dragon': 92,
  'Mihawk': 92,
  'Sengoku': 91,
  'Garling': 91,
  'Shiki': 91,
  'Rayleigh': 91,
  'Barbe Noire': 90,
  'Loki': 90,
  'Oden': 90,
  'Harald': 90,
  'Gaban': 90,
  'Luffy': 90,
  'Big Mom': 89,
  'Akainu': 89,

  'Marco': 88,
  'Aokiji': 88,
  'Sabo': 88,
  'Kizaru': 87,
  'Fujitora': 87,
  'Ryokogu': 87,
  'Saturn': 87,
  'Mars': 87,
  'Warcury': 87,
  'Jupiter': 87,
  'Venus': 87,
  'Shamrock': 87,
  'King': 86,
  'Katakuri': 86,
  'Yamato': 86,
  'Zoro': 86,
  'Law': 86,
  'Kidd': 86,
  'Boa Hancock': 86,

  'Sanji': 85,
  'Kuma': 85,
  'Ace': 84,
  'Queen': 84,
  'Doflamingo': 83,

  'Crocodile': 81,
  'Lucci': 79,
  'Moria': 76,
  'Koby': 75,
  'Bonny': 74,
  'Baggy': 50,
};

// Factions
export const FACTIONS: Faction[] = [
  { id: 'yonkos', name: 'Yonkos', members: ['Shanks', 'Kaido', 'Big Mom', 'Barbe Blanche', 'Barbe Noire', 'Baggy', 'Luffy'] },
  { id: 'marine', name: 'La Marine', members: ['Akainu', 'Aokiji', 'Kizaru', 'Fujitora', 'Ryokugyu', 'Sengoku', 'Garp', 'Koby'] },
  { id: 'gorosei', name: 'Gorosei', members: ['Saturn', 'Mars', 'Warcury', 'Jupiter', 'Venus', 'Garling'] },
  { id: 'roger_pirates', name: 'Équipage du Roi des Pirates', members: ['Roger', 'Rayleigh', 'Gaban', 'Shanks', 'Baggy'] },
  { id: 'corsaires', name: 'Les Grands Corsaires', members: ['Mihawk', 'Doflamingo', 'Crocodile', 'Boa Hancock', 'Kuma', 'Baggy', 'Law', 'Moria', 'Barbe Noire'] },
  { id: 'cent_betes', name: "L'Équipage aux Cent Bêtes", members: ['Kaido', 'Queen', 'King'] },
  { id: 'heritier_chapeau', name: "L'Héritier du Chapeau", members: ['Luffy', 'Roger', 'JoyBoy', 'Shanks'], isInstantWin: true },
  { id: 'revolutionnaires', name: "L'Armée Révolutionnaire", members: ['Monkey D. Dragon', 'Sabo', 'Kuma', 'Bonney'] },
  { id: 'volonte_d', name: 'La Volonté du D.', members: ['Luffy', 'Ace', 'Law', 'Garp', 'Monkey D. Dragon', 'Roger', 'Barbe Noire', 'Xebec'], isPureDBonus: true },
  { id: 'rocks', name: "L'Équipage de Rocks", members: ['Xebec', 'Barbe Blanche', 'Kaido', 'Big Mom', 'Shiki'] },
  { id: 'mugiwaras', name: "L'Équipage du Chapeau de Paille", members: ['Luffy', 'Zoro', 'Sanji'] },
  { id: 'pire_generation', name: 'La Pire Génération', members: ['Luffy', 'Zoro', 'Law', 'Kidd', 'Bonney'] },
  { id: 'freres_sang', name: 'Les Frères de Sang', members: ['Ace', 'Sabo', 'Luffy'] },
  { id: 'cross_guild', name: 'La Cross Guild', members: ['Baggy', 'Mihawk', 'Crocodile'] },
  { id: 'famille_charlotte', name: 'La Famille Charlotte', members: ['Big Mom', 'Katakuri'] },
  { id: 'barbe_blanche_crew', name: "L'Équipage de Barbe Blanche", members: ['Barbe Blanche', 'Marco', 'Ace'] },
];

export function calculateTeamScore(
  teamNames: string[],
  playerBudget: number,
  opponentBudget: number,
  isOnePieceBase: boolean = true
) {
  // Si ce n'est pas la base One Piece, aucun calcul de point / synergies / bonus budget n'est effectué.
  if (!isOnePieceBase) {
    return {
      basePowerTotal: 0,
      cardsPowerTotal: 0,
      pureDBonus: 0,
      economyBonus: 0,
      totalScore: 0,
      instantWin: false,
      activeSynergies: [],
      cardDetails: teamNames.map((name) => ({
        name,
        basePower: 0,
        boostPercent: 0,
        finalPower: 0,
      })),
    };
  }

  let instantWin = false;
  let pureDBonus = 0;
  const activeSynergies: { name: string; count: number; boost: number; isFull: boolean }[] = [];
  const factionBoosts: Record<string, number> = {};

  FACTIONS.forEach((faction) => {
    const count = teamNames.filter((name) => faction.members.includes(name)).length;

    if (count >= 2) {
      let boost = 0;
      if (count >= 6) boost = 30;
      else if (count >= 4) boost = 20;
      else if (count >= 2) boost = 10;

      const isFull = count === faction.members.length;
      if (isFull) {
        boost += 10;
      }

      faction.members.forEach((member) => {
        if (teamNames.includes(member)) {
          factionBoosts[member] = (factionBoosts[member] || 0) + boost;
        }
      });

      if (faction.isInstantWin && isFull) {
        instantWin = true;
      }

      activeSynergies.push({
        name: faction.name,
        count,
        boost,
        isFull,
      });
    }

    if (faction.isPureDBonus && teamNames.length > 0 && count === teamNames.length) {
      pureDBonus = 30;
    }
  });

  let basePowerTotal = 0;
  let cardsPowerTotal = 0;

  const cardDetails: CardResult[] = teamNames.map((name) => {
    const basePower = CHARACTER_POWER[name] || 50;
    const boostPercent = factionBoosts[name] || 0;
    const finalPower = Math.round(basePower * (1 + boostPercent / 100));

    basePowerTotal += basePower;
    cardsPowerTotal += finalPower;

    return {
      name,
      basePower,
      boostPercent,
      finalPower,
    };
  });

  const economyBonus = playerBudget > opponentBudget ? 20 : 0;
  const totalScore = cardsPowerTotal + pureDBonus + economyBonus;

  return {
    basePowerTotal,
    cardsPowerTotal,
    pureDBonus,
    economyBonus,
    totalScore,
    instantWin,
    activeSynergies,
    cardDetails,
  };
}