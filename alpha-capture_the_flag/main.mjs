import
{
    getObjectsByPrototype,
    getObjectById,
    getTime,
    getDirection,
    getDistance,
    getTerrainAt,
    RANGED_ATTACK,
    HEAL,
    ATTACK,
    TERRAIN_WALL,
    TERRAIN_SWAMP
}
from '/game';
import
{
    Creep,
    StructureTower
}
from '/game/prototypes';
import * as PathFinder from '/game/path-finder';
import
{
    Flag,
    BodyPart
}
from '/arena';
const ENGAGE_DISTANCE = 4;
// You can also import your files like this:
// import {roleAttacker} from './roles/attacker.mjs';
var myCreeps, enCreeps, enFlag, myTower, myFlag, enTower, avgMyCreeppos, avgEnCreeppos, distanceBetweenGroups;
var enAvgCreeppos, myAvgCreeppos;
var safeToGatherFull, safeToGathersmall;
var Attackers = [];
var rangers = [];
var healers = [];
var mytower = [];
var myrallyppoint;
var safecostmatrix = new PathFinder.CostMatrix;
var IsEnemyDefendingInAdvantageousPositionACTUAL;
var IsEnemyDefendingBaseACTUAL;
var getAverageDistanceBetweenCreepsMYACTUAL;
var defencebool = false;
var towerTarget;
var towerbool;
var getAverageDistanceBetweenCreepsENACTUAL;
const FinalFight = 1700;
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export function loop()
{
    ////////////////////////////////////////////////////////////////////////////////////////////////////////
  enFlag = getObjectsByPrototype(Flag).find(i => !i.my);
  myFlag = getObjectsByPrototype(Flag).find(i => i.my);
  myCreeps = getObjectsByPrototype(Creep).filter(i => i.my);
  enCreeps = getObjectsByPrototype(Creep).filter(i => !i.my);
  enTower = getObjectsByPrototype(StructureTower).find(i => !i.my);
  myTower = getObjectsByPrototype(StructureTower).find(i => i.my);
    ////////////////////////////////////////////////////////////////////////////////////////////////////////
  if(getTime() === 1)
  {
      createCostMatrixs();
      AssignRoles();
      if(enFlag.x == 2 && enFlag.y == 2)
      {
          myrallyppoint = {
              "x": 80,
              "y": 80
          };
      }
      if(enFlag.x == 97 && enFlag.y == 97)
      {
          myrallyppoint = {
              "x": 20,
              "y": 20
          };
      }
  }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////
    enAvgCreeppos = getAverageCreepPositions("en");
    myAvgCreeppos = getAverageCreepPositions("my");
    IsEnemyDefendingInAdvantageousPositionACTUAL = IsEnemyDefendingInAdvantageousPosition();
    IsEnemyDefendingBaseACTUAL = IsEnemyDefendingBase();
    getAverageDistanceBetweenCreepsMYACTUAL = getAverageDistanceBetweenCreeps("my");
    getAverageDistanceBetweenCreepsENACTUAL = getAverageDistanceBetweenCreeps("en");
    distanceBetweenGroups = getDistance(myAvgCreeppos, enAvgCreeppos);
    ////////////////////////////////////////////////////////////////////////////////////////////////////////
    console.log("getAverageDistanceBetweenCreepsMYACTUAL", getAverageDistanceBetweenCreepsMYACTUAL);
    console.log("getAverageDistanceBetweenCreepsENACTUAL", getAverageDistanceBetweenCreepsENACTUAL);
    console.log("IsEnemyDefendingInAdvantageousPositionACTUAL", IsEnemyDefendingInAdvantageousPositionACTUAL);
    console.log("IsEnemyDefendingBaseACTUAL", IsEnemyDefendingBaseACTUAL);
    console.log("distanceBetweenGroups", distanceBetweenGroups);

    if(getTime() > 20)
    {
        RunRoles();
        ///////////////
        Towers(myTower);
        //////////
        ///////////
        if(NeedDefence() && enCreeps.length + 5 > myCreeps.length)
        {
            defend();
        }
        if(getAverageDistanceBetweenCreepsMYACTUAL < 7 && getDistance(myAvgCreeppos, enFlag) < 25 && enCreeps.length < 3)
        {
            chargeFlag();
        }
    }
}

function chargeFlag()
{
    for(var i = 0; i < Attackers.length; i++)
    {
        Attackers[i].moveTo(enFlag);
    }
    for(var i = 0; i < rangers.length; i++)
    {
        rangers[i].moveTo(enFlag);
    }
}

function NeedDefence()
{
    var enCreepsCloserToMyFlagThanMyAvgPos = 0;
    for(var i = 0; i < enCreeps.length; i++)
    {
        if(getDistance(enCreeps[i], myFlag) < getDistance(myFlag, myAvgCreeppos))
        {
            enCreepsCloserToMyFlagThanMyAvgPos++;
        }
    }
    if(enCreepsCloserToMyFlagThanMyAvgPos > 3)
    {
        defencebool = true;
        return true;
    }
    if(getDistance(myAvgCreeppos, myFlag) > 8 && defencebool)
    {
        return true;
    }
    if(getDistance(myAvgCreeppos, myFlag) < 8 && defencebool)
    {
        defencebool = false;
    }
    if(getDistance(enAvgCreeppos, myFlag) < getDistance(myAvgCreeppos, myFlag) || getDistance(enAvgCreeppos, myFlag) < 30)
    {
        defencebool = true;
        return true;
    }
    else
    {
        defencebool = false;
        return false;
    }
}

function decideIfMassAttack(creep)
{
    var enemiesInRange = enCreeps.filter(i => getDistance(i, creep) <= 1).sort((a, b) => a.hits - b.hits);
    if(enemiesInRange.length != 0)
    {
        return true;
    }
    else
    {
        var counter = 0;
        counter += (enCreeps.filter(i => getDistance(i, creep) <= 2).length * 4);
        counter += (enCreeps.filter(i => getDistance(i, creep) <= 3).length - enCreeps.filter(i => getDistance(i, creep) <= 2).length);
        if(counter > 10)
        {
            return true;
        }
        else
        {
            return false;
        }
    }
}

function decideBestTarget(creep, range)
{
    var enemiesInRange = enCreeps.filter(i => getDistance(i, creep) <= range).sort((a, b) => a.hits - b.hits);
    var enAttk = [];
    var enheal = [];
    var enranger = [];
    for(var i = 0; i < enemiesInRange.length; i++)
    {
        if(enemiesInRange[i].body.some(i => i.type === ATTACK))
        {
            enAttk.push(enemiesInRange[i]);
        }
        else if(enemiesInRange[i].body.some(i => i.type === HEAL))
        {
            enheal.push(enemiesInRange[i]);
        }
        else if(enemiesInRange[i].body.some(i => i.type === RANGED_ATTACK))
        {
            enranger.push(enemiesInRange[i]);
        }
    }
    for(var i = 0; i < enAttk.length; i++)
    {
        if(enAttk[i].hits > 800) // low priority move
        {
            return enAttk[i];
        }
    }
    for(var i = 0; i < enheal.length; i++)
    {
        if(enheal[i].hits > 350) // low priority move
        {
            return enheal[i];
        }
    }
    for(var i = 0; i < enranger.length; i++)
    {
        if(enranger[i].hits > 350) // low priority move
        {
            return enranger[i];
        }
    }
    return enemiesInRange[0];
};

function getcreephealthPercentage(creep)
{
    return (creep.hitsMax / 100) * creep.hits;
}

function basicCreepCombarIntents(creep)
{
    //   creep.role= "ranger";creep.role= "healer";  creep.role= "attacker";
    if(creep != undefined && creep.body != undefined && creep.body.length != 0)
    {
        if(creep.role == "healer") // todo change to role in memory
        {
            var healTargets = myCreeps.filter(i => getDistance(i, creep) <= 3).filter(i => i.hits != i.hitsMax).sort((a, b) => getcreephealthPercentage(a) - getcreephealthPercentage(b));
            if(healTargets.length != 0)
            {
                creep.heal(healTargets[0]);
            }
        }
        if(creep.role == "attacker")
        {
            var enemiesInRange = enCreeps.filter(i => getDistance(i, creep) <= 1);
            if(enemiesInRange.length != 0)
            {
                creep.attack(decideBestTarget(creep, 1));
            }
        }
        if(creep.role == "ranger")
        {
            if(creep.body.some(i => i.type === HEAL)) // creep contains heal part
            {
                creep.heal(creep);
            }
            var enemiesInRange = enCreeps.filter(i => getDistance(i, creep) <= 3);
            if(enemiesInRange.length != 0)
            {
                if(!decideIfMassAttack(creep))
                {
                    creep.rangedAttack(decideBestTarget(creep, 3));
                }
                else
                {
                    creep.rangedMassAttack();
                }
            }
        }
    }
}

function basicAttacker(creep)
{
    basicCreepCombarIntents(creep);
    var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
    if(IsEnemyDefendingBaseACTUAL || (enCreeps == undefined || enCreeps.length < 2))
    {
        FindParts(creep, "attack");
    }
    else if(IsEnemyDefendingInAdvantageousPositionACTUAL && getDistance(targets[0], creep) > ENGAGE_DISTANCE)
    {
        creep.moveTo(myrallyppoint);
        // moveToRally//
    }
    else if(getTime() > FinalFight || (!IsEnemyDefendingInAdvantageousPositionACTUAL || getDistance(targets[0], creep) < 10))
    {
        if(distanceBetweenGroups < 15 || (distanceBetweenGroups < 25 && (getAverageDistanceBetweenCreepsENACTUAL - 1 > getAverageDistanceBetweenCreepsMYACTUAL || getAverageDistanceBetweenCreepsMYACTUAL ==1)))
        {
            var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
            creep.moveTo(targets[0]);
        }
        else if(getAverageDistanceBetweenCreepsMYACTUAL < getAverageDistanceBetweenCreepsENACTUAL || getAverageDistanceBetweenCreepsMYACTUAL ==1)
        {
            var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
            if(getDistance(targets[0], creep) > 1)
            {
                creep.moveTo(targets[0]);
            }
        }
        else if(getAverageDistanceBetweenCreepsMYACTUAL >= getAverageDistanceBetweenCreepsENACTUAL && !IsEnemyDefendingBaseACTUAL)
        {
            creep.moveTo(myAvgCreeppos);
        }
    }
    if(getTime() > FinalFight && enCreeps.length + 3 < myCreeps.length)
    {
        //charge as one
        creep.moveTo(enFlag);
    }
}

function basichealer(creep)
{
    var healTargets = myCreeps.filter(i => i.hits != i.hitsMax).sort((a, b) => a.hits - b.hits);
    if(healTargets.length != 0)
    {
        if(getDistance(healTargets[0], creep) > 3)
        {
            creep.moveTo(healTargets[0]);
        }
        else if(getDistance(healTargets[0], creep) < 4 && getDistance(healTargets[0], creep) != 1)
        {
            creep.moveTo(healTargets[0]);
            creep.rangedHeal(healTargets[0]);
        }
        else if(getDistance(healTargets[0], creep) == 1)
        {
            creep.heal(healTargets[0]);
        }
    }
}

function healer(creep)
{
    basicCreepCombarIntents(creep);
    if(getObjectById(creep.targetfollow) != undefined)
    {
        creep.moveTo(getObjectById(creep.targetfollow));
    }
    else
    {
        basichealer(creep);
    }
}

function rangedAttacker(creep)
{
    //  console.log("IsEnemyDefendingInAdvantageousPositionACTUAL-",IsEnemyDefendingInAdvantageousPositionACTUAL);
    basicCreepCombarIntents(creep);
    var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
    if(IsEnemyDefendingBaseACTUAL || (enCreeps == undefined || enCreeps.length < 2))
    {
        if(getObjectById(creep.healer) != undefined)
        {
            FindParts(creep, "ranged_attack");
        }
        else
        {
            creep.moveTo(myrallyppoint);
        }
    }
    else if(IsEnemyDefendingInAdvantageousPositionACTUAL && getDistance(targets[0], creep) > ENGAGE_DISTANCE)
    {
        creep.moveTo(myrallyppoint);
        // moveToRally//
    }
    else if(getTime() > FinalFight || (!IsEnemyDefendingInAdvantageousPositionACTUAL || getDistance(targets[0], creep) < 10))
    {
        if(distanceBetweenGroups < 10 || (distanceBetweenGroups < 20 && (getAverageDistanceBetweenCreepsENACTUAL - 1 > getAverageDistanceBetweenCreepsMYACTUAL || getAverageDistanceBetweenCreepsMYACTUAL ==1)))
        {
            var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
            if(getDistance(targets[0], creep) > 3)
            {
                creep.moveTo(targets[0]);
            }
        }
        else if(getAverageDistanceBetweenCreepsMYACTUAL < getAverageDistanceBetweenCreepsENACTUAL || getAverageDistanceBetweenCreepsMYACTUAL ==1)
        {
            var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
            if(getDistance(targets[0], creep) > 3)
            {
                creep.moveTo(targets[0]);
            }
        }
        else if(getAverageDistanceBetweenCreepsMYACTUAL >= getAverageDistanceBetweenCreepsENACTUAL)
        {
            //	move to enemy avg
            creep.moveTo(myAvgCreeppos);
        }
    }
    if(getTime() > FinalFight && enCreeps.length + 3 < myCreeps.length)
    {
        //charge as one
        creep.moveTo(enFlag);
    }
    if(creep.healer == 999 && getTime() > FinalFight)
    {
        creep.moveTo(myFlag);
    }
}

function IsEnemyDefendingInAdvantageousPosition()
{
    var enDefendingRally = 0;
    var enavgdist = getAverageDistanceBetweenCreepsENACTUAL;
    for(var i = 0; i < enCreeps.length; i++)
    {
        if(getDistance(enCreeps[i], enFlag) > 6 && getDistance(enCreeps[i], enFlag) < 40)
        {
            enDefendingRally++;
        }
    }
    if(enDefendingRally > 6)
    {
        return true;
    }
    else
    {
        return false;
    }
}

function IsEnemyDefendingBase()
{
    var enDefendingBase = 0;
    var enavgdist = getAverageDistanceBetweenCreepsENACTUAL;
    for(var i = 0; i < enCreeps.length; i++)
    {
        if(getDistance(enCreeps[i], enFlag) < 7)
        {
            enDefendingBase++;
        }
    }
    if(enDefendingBase > 6)
    {
        return true;
    }
    else
    {
        return false;
    }
}

function HowManyEnemyHarvestingBodyParts()
{
    var enCreepsHarvesting = 0;
    for(var i = 0; i < enCreeps.length; i++)
    {
        if(getTerrainAt(myCreeps[i].pos.x, myCreeps[i].pos.y) == TERRAIN_SWAMP && getDistance(enCreeps[i], enFlag) > 5 && getDistance(enCreeps[i], myFlag) > 5)
        {
            enCreepsHarvesting++;
        }
    }
    return enCreepsHarvesting;
}

function distanceGroups()
{
    return getDistance(myAvgCreeppos, enAvgCreeppos);
}

function checkforgrouping()
{
    var myavgdist = getAverageDistanceBetweenCreepsMYACTUAL;
    var enavgdist = getAverageDistanceBetweenCreepsENACTUAL;
    if(avgdist > enavgdist && getTime() > 50 && enCreeps.length + 3 > myCreeps.length)
    {
        console.log("group creeps");
        //    groupCreepsToAveragePosition();
    }
    else
    {
        console.log("creeps groups");
    }
}

function groupCreepsToAveragePosition()
{
    for(var i = 0; i < myCreeps.length; i++)
    {
        myCreeps[i].moveTo(myAvgCreeppos);
    }
}

function getAverageCreepPositions(a)
{
    var creepArry = [];
    if(a === "en")
    {
        creepArry = enCreeps;
    }
    if(a === "my")
    {
        creepArry = myCreeps;
    }
    var avgX = 0;
    var avgY = 0;
    var count = 0;
    for(var i = 0; i < creepArry.length; i++)
    {
        if(getDistance(creepArry[i], myFlag) > 6 && getDistance(creepArry[i], enFlag) > 6)
        {
            count++;
            avgX += creepArry[i].x;
            avgY += creepArry[i].y;
        }
    }
    if(count > 0)
    {
        return {
            "x": Math.floor(avgX / count),
            "y": Math.floor(avgY / count)
        };
    }
    else
    {



      if(enFlag.x == 2 && enFlag.y == 2)
      {
          return   {
              "x": 80,
              "y": 80
          };
      }
      if(enFlag.x == 97 && enFlag.y == 97)
      {
          return  {
              "x": 20,
              "y": 20
          };
      }






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

function getAverageDistanceBetweenCreeps(arr)
{
    var averageDistance = 0;
    var count = 0;
    var creepArry = [];
    if(arr === "en")
    {
        creepArry = enCreeps;
    }
    if(arr === "my")
    {
        creepArry = myCreeps;
    }
    for(var i = 0; i < creepArry.length; i++)
    {
        if(getDistance(creepArry[i], myFlag) > 6 && getDistance(creepArry[i], enFlag) > 6)
        {
            for(var j = 0; j < creepArry.length; j++)
            {
                if(getDistance(creepArry[j], myFlag) > 6 && getDistance(creepArry[j], enFlag) > 6)
                {
                    averageDistance += getDistance(creepArry[i], creepArry[j]);
                    count++;
                }
            }
        }
    }
    if(count > 0)
    {
        return Math.floor(averageDistance / count);
    }
    else
    {
        return 0;
    }
}



function FindParts(creep, part)
{
    var bodyparts = getObjectsByPrototype(BodyPart).filter(i => (i.type == "move")).sort(i => getDistance(i, creep));
    if(part === "attack")
    {
        bodyparts = getObjectsByPrototype(BodyPart).filter(i => (i.type == "attack" || i.type == "move")).sort(i => getDistance(i, creep));
    }
    if(part === "ranged_attack")
    {
        bodyparts = getObjectsByPrototype(BodyPart).filter(i => (i.type == "ranged_attack" || i.type == "heal" || i.type == "move")).sort(i => getDistance(i, creep));
    }
    if(bodyparts.length > 0)
    {
        creep.moveTo(bodyparts[0]);
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

function createCostMatrixs()
{
    for(var x = 0; x < 100; x++)
    {
        for(var y = 0; y < 100; y++)
        {
            if(getTerrainAt(x, y) === TERRAIN_WALL)
            {
                safecostmatrix.set(x, y, 255);
            }
            else if(getTerrainAt(x, y) === TERRAIN_SWAMP)
            {
                safecostmatrix.set(x, y, 5);
            }
            else
            {
                safecostmatrix.set(x, y, 255);
            }
            safecostmatrix.set((enTower.x - 50) + x, (enTower.y - 50) + y, 50);
        }
    }
}

function AssignRoles()
{
    myCreeps.forEach(creep =>
    {
        if(creep.body.some(i => i.type === ATTACK)) // creep contains attack part
        {
            Attackers.push(creep);
            creep.healer = 999;
            creep.allowGather = true;
            creep.role = "attacker";
        }
        if(creep.body.some(i => i.type === RANGED_ATTACK)) // creep contains  ranged attack part
        {
            rangers.push(creep);
            creep.healer = 999;
            creep.allowGather = true;
            creep.role = "ranger";
        }
    });
    myCreeps.forEach(creep =>
    {
        if(creep.body.some(i => i.type === HEAL)) // creep contains heal part
        {
            creep.role = "healer";
            if(healers.length == 0)
            {
                creep.targetfollow = Attackers[0].id;
                Attackers[0].healer = creep.id;
                creep.allowGather = true;
            }
            if(healers.length == 1)
            {
                creep.targetfollow = Attackers[1].id;
                Attackers[1].healer = creep.id;
                creep.allowGather = true;
            }
            ////////////////////////////////////////////////////////
            if(healers.length == 2)
            {
                creep.targetfollow = rangers[0].id;
                rangers[0].healer = creep.id;
                creep.allowGather = false;
            }
            if(healers.length == 3)
            {
                creep.targetfollow = rangers[1].id;
                rangers[1].healer = creep.id;
                creep.allowGather = false;
            }
            if(healers.length == 4)
            {
                creep.targetfollow = rangers[2].id;
                rangers[2].healer = creep.id;
                creep.allowGather = false;
            }
            if(healers.length == 5)
            {
                creep.targetfollow = rangers[3].id;
                rangers[3].healer = creep.id;
                creep.allowGather = false;
            }
            healers.push(creep);
        }
    });
}

function RunRoles()
{
    for(var i = 0; i < Attackers.length; i++)
    {
        basicAttacker(Attackers[i]);
    }
    for(var i = 0; i < rangers.length; i++)
    {
        rangedAttacker(rangers[i]);
    }
    for(var i = 0; i < healers.length; i++)
    {
        healer(healers[i]);
    }
}

function Towers(myTower)
{
    var allEn = enCreeps.sort(i => getDistance(i, myTower));
    if(allEn == undefined)
    {
        var a = true;
    }
    else if(getDistance(allEn[0], myTower) > 50)
    {
        var a = true;
    }
    else if(getAverageDistanceBetweenCreepsENACTUAL > 8)
    {
        var a = true;
    }
    else
    {
        var a = false;
    }
    var enemiesInRange2 = enCreeps.filter(i => getDistance(i, myFlag) < 5);
    if(a || enemiesInRange2.length != 0)
    {
        var range = myTower.store.energy;
        var enemiesInRange = enCreeps.filter(i => getDistance(i, myTower) < range);
        var myCreepOnMyFLag = myCreeps.filter(i => getDistance(i, myFlag) < 1);
        if(myCreepOnMyFLag != undefined && myCreepOnMyFLag.hits + 400 > myCreepOnMyFLag.hitsmax)
        {
            myTower.heal(healTargets[0]);
        }
        else if(enemiesInRange.length > 0)
        {
            myTower.attack(enemiesInRange[0]);
        }
        if(IsEnemyDefendingBase())
        {
            var healTargets = myCreeps.filter(i => getDistance(i, myTower) <= 50).filter(i => i.hits != i.hitsMax).sort((a, b) => a.hits - b.hits);
            if(healTargets.length > 0)
            {
                myTower.heal(healTargets[0]);
            }
        }
    }
    else if(enCreeps != undefined && enCreeps.length != 0)
    {
        console.log("twn !a ");
        //          towerbool
        if(towerTarget == undefined)
        {
            var enemiesInRange = enCreeps.filter(i => getDistance(i, myTower) < 20);
            towerTarget = enemiesInRange[0];
        }
        if(towerTarget != undefined)
        {
            if(myTower.store.energy > 49)
            {
                towerbool = true;
                var enemiesInRange = enCreeps.filter(i => getDistance(i, myTower) < 20);
                towerTarget = enemiesInRange[0];
            }
            if(myTower.store.energy < 9)
            {
                towerbool = false;
            }
            if(towerbool)
            {
                myTower.attack(towerTarget);
            }
        }
    }
}
