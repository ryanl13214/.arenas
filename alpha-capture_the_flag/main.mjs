// Note that there is no global objects like Game or Memory. All methods, prototypes and constants are imported built-in modules
import
{
		getObjectsByPrototype,
		getTime,
		RANGED_ATTACK,
		HEAL,
		ATTACK,
		getDirection,
		getDistance,
		getTerrainAt,
		TERRAIN_WALL,
		TERRAIN_SWAMP
}
from '/game';
// Everything can be imported either from the root /game module or corresponding submodules
import
{
		Creep,
		StructureTower
}
from '/game/prototypes';
import * as PathFinder from '/game/path-finder'; //--> //PathFinder.searchPath
import
{
		Flag,
		BodyPart
}
from '/arena';
// You can also import your files like this:
// import {roleAttacker} from './roles/attacker.mjs';
// We can define global objects that will be valid for the entire match.
// The game guarantees there will be no global reset during the match.
// Note that you cannot assign any game objects here, since they are populated on the first tick, not when the script is initialized.
let myCreeps, enemyCreeps, enemyFlag, myTower, myFlag, enTower;
var averageCreepPos;
var creepsbattleready;


var Attackers = [];
var rangers = [];
var healers = [];
var mytower = [];
var safecostmatrix = new PathFinder.CostMatrix;
var prepAssault = false;
var assaultNotReady = true;
const FinalFight = 1600;
// This is the only exported function from the main module. It is called every tick.
export function loop()
{
		myCreeps = getObjectsByPrototype(Creep).filter(i => i.my);
		enemyCreeps = getObjectsByPrototype(Creep).filter(i => !i.my);
		enemyFlag = getObjectsByPrototype(Flag).find(i => !i.my);
		myFlag = getObjectsByPrototype(Flag).find(i => i.my);
		enTower = getObjectsByPrototype(StructureTower).find(i => !i.my);
		if(getTime() === 1)
		{
				for(var x = 0; x < 100; x++)
				{
						for(var y = 0; y < 100; y++)
						{
								if(getTerrainAt(x, y) == TERRAIN_WALL)
								{
										safecostmatrix.set(x, y, 255);
								}
								else if(getTerrainAt(x, y) == TERRAIN_SWAMP)
								{
										safecostmatrix.set(x, y, 5);
								}
								safecostmatrix.set((enTower.x - 50) + x, (enTower.y - 50) + y, 50);
						}
				}
				myCreeps.forEach(creep =>
				{
						if(creep.body.some(i => i.type === ATTACK)) // creep contains attack part
						{
								Attackers.push(creep);
								creep.healer = 1;
						}
						if(creep.body.some(i => i.type === RANGED_ATTACK)) // creep contains  ranged attack part
						{

										rangers.push(creep);
										creep.healer = 1;

						}
				});
				myCreeps.forEach(creep =>
				{
						if(creep.body.some(i => i.type === HEAL)) // creep contains heal part
						{
								if(healers.length == 0)
								{
										creep.targetfollow = Attackers[0];
										Attackers[0].healer = creep;
										creep.allowGather = true;
								}
								if(healers.length == 1)
								{
										creep.targetfollow = Attackers[1];
										Attackers[1].healer = creep;
										creep.allowGather = true;
								}
								////////////////////////////////////////////////////////
								if(healers.length == 2)
								{
										creep.targetfollow = rangers[0];
										rangers[0].healer = creep;
										creep.allowGather = false;
								}
								if(healers.length == 3)
								{
										creep.targetfollow = rangers[1];
										rangers[1].healer = creep;
										creep.allowGather = false;
								}
								if(healers.length == 4)
								{
										creep.targetfollow = rangers[2];
										rangers[2].healer = creep;
										creep.allowGather = false;
								}
								if(healers.length == 5)
								{
										creep.targetfollow = rangers[3];
										rangers[3].healer = creep;
										creep.allowGather = false;
								}
								healers.push(creep);
						}
				});
		}

		averageCreepPositions();

		if(getTime() > 20)
		{

				basicAttacker(Attackers[0]);
				basicAttacker(Attackers[1]);
				for(var i = 0; i < rangers.length; i++)
				{
						rangedAttacker(rangers[i]);
				}
				for(var i = 0; i < healers.length; i++)
				{
						healer(healers[i]);
				}
				///////////////
				myTower = getObjectsByPrototype(StructureTower).find(i => i.my);
				var range = myTower.store.energy;
				var enemiesInRange = enemyCreeps.filter(i => getDistance(i, myTower) < range);
				if(enemiesInRange.length > 0)
				{
						myTower.attack(enemiesInRange[0]);
				}
				//////////
				checkForAssaults();
				///////////
 checkforgrouping();
				///////////
				if(prepAssault == true && assaultNotReady == true)
				{
						prepForAssault();
				}
				if(NeedDefence())
				{
					console.log("defend");
						defend();
				}
				enemyDefendingInAdvantageousPosition();

		}




}
function enemyDefendingInAdvantageousPosition()
{

			var enemiesInRange = enemyCreeps.filter(i => getDistance(i, enTower) <35);
			var enemiesInRange2 = enemyCreeps.filter(i => getDistance(i, enTower) <7);

if(enemiesInRange.length > 10 &&  enemiesInRange2.length < 10){

defend();


}












}
function checkforgrouping()
{
	//var averageCreepPos;
	//var creepsbattleready;

var avgdist = getAverageDistanceBetweenCreeps();
if(avgdist > 5 && getTime() > 75 && enemyCreeps.length >0  ){

	creepsbattleready=false;
}else{

	creepsbattleready=true;
}

	console.log("creeps well grouped ",creepsbattleready);



}
function averageCreepPositions()
{
	var avgX = 0;
	var avgY = 0;
	var count = 0;
	for(var i = 0; i < myCreeps.length; i++)
	{
		if(myCreeps[i].x != myFlag.x && myCreeps[i].y != myFlag.y){
			count++;
		  avgX +=	myCreeps[i].x;
			avgY +=	myCreeps[i].y;
		}



	}

averageCreepPos = {"x": Math.floor(avgX/count), "y": Math.floor(avgY/count)};




}

function NeedDefence()
{
		var distanceBetweenEnemyAndMyFlag = 0;
		var distanceBetweenMeAndMyFlag = 0;
		for(var i = 0; i < myCreeps.length; i++)
		{
				distanceBetweenMeAndMyFlag += getDistance(myCreeps[i], myFlag);
		}
		for(var i = 0; i < enemyCreeps.length; i++)
		{
				distanceBetweenEnemyAndMyFlag += getDistance(enemyCreeps[i], myFlag);
		}
		if(distanceBetweenEnemyAndMyFlag / enemyCreeps.length < distanceBetweenMeAndMyFlag / myCreeps.length && enemyCreeps.length > 4)
		{
				console.log("enemy close to flag");
				return true;
		}
		else
		{
				return false;
		}
}

function defend()
{
		for(var i = 0; i < Attackers.length; i++)
		{
				Attackers[i].moveTo(myFlag);
		}
		for(var i = 0; i < rangers.length; i++)
		{
				rangers[i].moveTo(myFlag);
		}
		for(var i = 0; i < healers.length; i++)
		{
				healers[i].moveTo(myFlag);
		}
}

function prepForAssault()
{
		if(enemyFlag.x == 2)
		{
				var rallyppoint = {
						"x": 80,
						"y": 80
				};
		}
		if(enemyFlag.x == 97)
		{
				var rallyppoint = {
						"x": 20,
						"y": 20
				};
		}
		for(var i = 0; i < Attackers.length; i++)
		{
				Attackers[i].moveTo(rallyppoint);
		}
		for(var i = 0; i < rangers.length; i++)
		{
				rangers[i].moveTo(rallyppoint);
		}
		for(var i = 0; i < healers.length; i++)
		{
				healers[i].moveTo(rallyppoint);
		}
		if(getAverageDistanceBetweenCreeps() < 7 || (getAverageDistanceBetweenCreeps() < 15 && getTime() > FinalFight + 80))
		{
				console.log("assault ready");
				assaultNotReady = false;
		}
}

function moveAllToRallypoint()
{
	console.log("moveAllToRallypoint");
		if(enemyFlag.x == 2)
		{
				var rallyppoint = {
						"x": 80,
						"y": 80
				};
		}
		if(enemyFlag.x == 97)
		{
				var rallyppoint = {
						"x": 20,
						"y": 20
				};
		}
		for(var i = 0; i < Attackers.length; i++)
		{
				Attackers[i].moveTo(rallyppoint);
		}
		for(var i = 0; i < rangers.length; i++)
		{
				rangers[i].moveTo(rallyppoint);
		}
		for(var i = 0; i < healers.length; i++)
		{
				healers[i].moveTo(rallyppoint);
		}
}

function getAverageDistanceBetweenCreeps()
{
		var averageDistance = 0;
		var count = 0;
		for(var i = 0; i < rangers.length; i++)
		{
				for(var j = 0; j < rangers.length; j++)
				{
						averageDistance += getDistance(rangers[i], rangers[j]);
						count++;
				}
				for(var j = 0; j < Attackers.length; j++)
				{
						averageDistance += getDistance(rangers[i], Attackers[j]);
						count++;
				}
		}
		for(var i = 0; i < Attackers.length; i++)
		{
				for(var j = 0; j < rangers.length; j++)
				{
						averageDistance += getDistance(Attackers[i], rangers[j]);
						count++;
				}
				for(var j = 0; j < Attackers.length; j++)
				{
						averageDistance += getDistance(Attackers[i], Attackers[j]);
						count++;
				}
		}
		//console.log("avg", averageDistance / count);
		return averageDistance = averageDistance / count;
}

function checkForAssaults()
{
		var enemyCreeps = getObjectsByPrototype(Creep).filter(i => !i.my);
		var enemiesInRange = enemyCreeps.filter(i => getDistance(i, enemyFlag) <= 7);
		if((enemiesInRange.length < 10 && getTime() > 1000) && enemyCreeps.length > 4)
		{
				var enemiesInRange = enemyCreeps.filter(i => getDistance(i, myFlag) <= 35);
				if(getAverageDistanceBetweenCreeps() > 8 && enemiesInRange.length == 0)
				{
						console.log("rally");
						moveAllToRallypoint();
				}
		}
}

function checkForStaticDefence(creep)
{
		var enemyCreeps = getObjectsByPrototype(Creep).filter(i => !i.my);
		var enemiesInRange = enemyCreeps.filter(i => getDistance(i, enemyFlag) <= 10);
		if(enemiesInRange.length > 10 && getTime() > FinalFight)
		{
				prepAssault = true;
		}
		if((enemiesInRange.length > 10 && getTime() > 35 && getTime() < FinalFight) /* creeps hovering near their own base */ )
		{
				return true; // collect bodyparts
		}
		else if((enemyCreeps.length < 3 && getTime() < FinalFight) /*enemy has few creeps left */ )
		{
					prepAssault = true;
				return true; // collect bodyparts
		}
		else
		{
				return false; // fight
		}
}

function FindParts(creep, part)
{
		//	console.log("find parts");
		var enTower = getObjectsByPrototype(StructureTower).find(i => !i.my);
		var bodyparts = getObjectsByPrototype(BodyPart).filter(i => (i.type == part || i.type == "move")).filter(i => getDistance(i, enTower) > 50).sort(i => getDistance(i, creep));
		var range = 1;
		if(part == "ranged_attack")
		{
				range = 3;
		}
		if(part == "heal")
		{
				var healTargets = myCreeps.filter(i => getDistance(i, creep) <= 3).filter(i => i.hits != i.hitsMax).sort((a, b) => a.hits - b.hits);
				if(healTargets.length > 0)
				{
						if(getDistance(healTargets[0], creep) === 1)
						{
								creep.heal(healTargets[0]);
						}
						else
						{
								creep.rangedHeal(healTargets[0]);
						}
				}
		}
		var enemiesInRange = enemyCreeps.filter(i => getDistance(i, creep) <= range);
		if(part == "ranged_attack")
		{
				creep.rangedAttack(enemiesInRange[0]);
		}
		if(bodyparts.length > 0)
		{
				Safemove(creep, bodyparts[0]);
		}
}

function basicAttacker(creep)
{
	//var averageCreepPos;
	//var creepsbattleready;


		if(!checkForStaticDefence(creep) && (prepAssault == false || assaultNotReady == false))
		{
				var enemyCreeps = getObjectsByPrototype(Creep).filter(i => !i.my);
				var targets = enemyCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
				var range = 1;
				var enemiesInRange = enemyCreeps.filter(i => getDistance(i, creep) <= range);
				if(enemiesInRange.length > 0)
				{
						creep.attack(enemiesInRange[0]);
						creep.moveTo(enemiesInRange[0]);
				}
				else
				{
					if(creepsbattleready ){
								creep.moveTo(targets[0]);
					}else{
						console.log("A moving to avgcreep");
						creep.moveTo(averageCreepPos);
					}


				}
				slaveHealer(creep, creep.healer);
		}
		else
		{
				FindParts(creep, "attack");
		}
}

function slaveHealer(creep, healer)
{
		if(creep.healer != 1)
		{ // and healer is alive
				try
				{
						var q = getDistance(healer, creep);
						if(q > 1)
						{
								//	console.log("move to healer");
								creep.moveTo(creep);
						}
				}
				catch (e)
				{}
		}
}

function rangedAttacker(creep)
{
		if(!checkForStaticDefence(creep) && (prepAssault == false || assaultNotReady == false) )
		{
				var targets = enemyCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
				if(targets.length > 0)
				{
						var range = 3;
						var enemiesInRange = enemyCreeps.filter(i => getDistance(i, creep) <= range).sort((a, b) => a.hits - b.hits);
						var range = 2;
						var enemiesInMedRange = enemyCreeps.filter(i => getDistance(i, creep) <= range).sort((a, b) => a.hits - b.hits);
						var range2 = 1;
						var enemiesInCloseRange = enemyCreeps.filter(i => getDistance(i, creep) <= range2).sort((a, b) => a.hits - b.hits);
						if(enemiesInCloseRange.length >0)
						{
								creep.rangedMassAttack();
						}
						else if(enemiesInRange.length >0 && enemiesInMedRange.length < 3)
				  	{
								creep.rangedAttack(enemiesInRange[enemiesInRange.length-1]);
						}
						else{
								creep.rangedMassAttack();
						}
						if(getTime() < FinalFight)
						{
							if(creepsbattleready ){
										creep.moveTo(targets[0]);
							}else{
								creep.moveTo(averageCreepPos);
							}
						}
						else
						{
							if(creepsbattleready ){
									creep.moveTo(enemyFlag);
							}else{
								creep.moveTo(averageCreepPos);
							}

						}
				}
				else
				{

					if(creepsbattleready  ){
									creep.moveTo(enemyFlag);
					}else{
		     	creep.moveTo(averageCreepPos);
					}



				}
				var range = 3;
				var enemiesInRange = enemyCreeps.filter(i => getDistance(i, creep) <= range);
				if(enemiesInRange.length > 0)
				{
					  flee(creep, enemiesInRange, range);
				}
		}
		else
		{
				FindParts(creep, "ranged_attack");
		}
		if(creep.healer != 1)
		{
				slaveHealer(creep, creep.healer);
		}
}



function moveToHeal(creep)
{
		var myCreeps = getObjectsByPrototype(Creep).filter(i => i.my);
		var healTargets = myCreeps.filter(i => i.hits != i.hitsMax).sort((a, b) => a.hits - b.hits);
		if(healTargets.length > 0)
		{
				if(getDistance(healTargets[0], creep) === 1)
				{
						creep.heal(healTargets[0]);
				}
				else if(getDistance(healTargets[0], creep) < 4)
				{
						creep.rangedHeal(healTargets[0]);
				}
				else
				{
						creep.moveTo(healTargets[0]);
				}
		}
}

function healer(creep)
{
		//console.log("H-" ,JSON.stringify(creep.targetfollow));
		if(!checkForStaticDefence(creep))
		{
				var distcalc = getDistance(enemyFlag, creep)
				if(getTime() < 1950 - distcalc && creep.targetfollow.x != undefined)
				{
						creep.moveTo(creep.targetfollow);
						creep.heal(creep.targetfollow);
				}
				else if(getTime() < 1950 - distcalc && creep.targetfollow.x == undefined)
				{
						moveToHeal(creep);
				}
				else
				{
						creep.moveTo(enemyFlag);
				}
				var healTargets = myCreeps.filter(i => getDistance(i, creep) <= 3).filter(i => i.hits != i.hitsMax).sort((a, b) => a.hits - b.hits);
				if(healTargets.length > 0 && creep.hits > (creep.hitsMax - 200))
				{
						if(getDistance(healTargets[0], creep) === 1)
						{
								creep.heal(healTargets[0]);
						}
						else
						{
								creep.rangedHeal(healTargets[0]);
						}
				}
				else
				{
						creep.heal(creep);
				}
		}
		else
		{
				if(creep.allowGather)
				{
						FindParts(creep, "heal");
				}
				else
				{
						moveToHeal(creep);
				}
		}
}

function Safemove(creep, target)
{
		if(creep.currpath == undefined || creep.currpath.path.length == 0)
		{
				creep.currpath = PathFinder.searchPath(creep, target,
				{
						costMatrix: safecostmatrix
				});
		}
		else
		{
				if(creep.currpath.path.length > 0)
				{
						var direction = getDirection(creep.currpath.path[0].x - creep.x, creep.currpath.path[0].y - creep.y);
						var tmp = creep.move(direction);
						if(tmp == 0)
						{
								//	creep.currpath.path =
								creep.currpath.path.shift();
						}
						//	creep.moveTo(target);
				}
		}
}

function flee(creep, targets, range)
{
		let result = PathFinder.searchPath(creep, targets.map(i => (
		{
				pos: i,
				range
		})),
		{
				flee: true
		});
		if(result.path.length > 0)
		{
				let direction = getDirection(result.path[0].x - creep.x, result.path[0].y - creep.y);
				creep.move(direction);
		}
}
