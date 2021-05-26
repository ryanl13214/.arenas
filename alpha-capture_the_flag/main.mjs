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
var creepsActivlyEngagingEnemy;
var getAverageDistanceBetweenCreepsENACTUAL;
var enemyUsingQuadSquads = false;
var currentState;
var movePositionArray;
const FinalFight = 1700;
const ENGAGE_DISTANCE = 8;
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
    if(myCreeps == undefined)
    {
        myCreeps = [];
    }
    if(enCreeps == undefined)
    {
        enCreeps = [];
    }
    //  myCreeps = getObjectsByPrototype(Creep).filter(i => i.my);
    //  enCreeps = getObjectsByPrototype(Creep).filter(i => !i.my);
    ////////////////////////////////////////////////////////////////////////////////////////////////////////
    if(getTime() === 1)
    {
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
    getState();
    ////////////////////////////////////////////////////////////////////////////////////////////////////////
    console.log("getAverageDistanceBetweenCreepsMYACTUAL------", getAverageDistanceBetweenCreepsMYACTUAL);
    console.log("getAverageDistanceBetweenCreepsENACTUAL------", getAverageDistanceBetweenCreepsENACTUAL);
    console.log("IsEnemyDefendingInAdvantageousPositionACTUAL-", IsEnemyDefendingInAdvantageousPositionACTUAL);
    console.log("IsEnemyDefendingBaseACTUAL-------------------", IsEnemyDefendingBaseACTUAL);
    console.log("distanceBetweenGroups------------------------", distanceBetweenGroups);
    console.log("defencebool----------------------------------", defencebool);
    console.log("enemyUsingQuadSquads-------------------------", enemyUsingQuadSquads);
    console.log("my creeps------------------------------------", myCreeps.length);
    console.log("en creeps------------------------------------", enCreeps.length);
    console.log("checkForActiveEngagements--------------------", checkForActiveEngagements());
    console.log("current state--------------------------------", currentState);
    if(getTime() > 20)
    {
        createMoveTables();
        RunRoles();
        ///////////////
        try
        {
            Towers(myTower);
        }
        catch (e)
        {}
        ///////////////
        if(getAverageDistanceBetweenCreepsMYACTUAL < 7 && getDistance(myAvgCreeppos, enFlag) < 25 && enCreeps.length < 3)
        {
            chargeFlag();
        }
    }
}

function checkForActiveEngagements()
{
    var numberEngaged = 0;
    for(var i = 0; i < myCreeps.length; i++)
    {
        if(myCreeps[i].engaged == true)
        {
            numberEngaged++;
        }
    }
    if(numberEngaged > 2)
    {
        return true;
    }
    else
    {
        return false;
    }
}

function decideToMoveThroughSwampCorridor()
{
    var topCorridor = {
        "x": 65,
        "y": 35
    };
    var bottomCorridor = {
        "x": 35,
        "y": 65
    };
    if((getDistance(myAvgCreeppos, topCorridor) < 5 || getDistance(myAvgCreeppos, topCorridor) < 5) && getDistance(myAvgCreeppos, enAvgCreeppos) > 12)
    {
        return true;
    }
    return false;
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
        if(getDistance(enCreeps[i], myFlag) + 1 < getDistance(myFlag, myAvgCreeppos))
        {
            enCreepsCloserToMyFlagThanMyAvgPos++;
        }
    }
    if(enCreepsCloserToMyFlagThanMyAvgPos == 0)
    {
        defencebool = false;
        return false;
    }
    if(enCreepsCloserToMyFlagThanMyAvgPos > 3)
    {
        defencebool = true;
        return true;
    }
    if(getDistance(myAvgCreeppos, myFlag) > ENGAGE_DISTANCE && defencebool && !creepsActivlyEngagingEnemy)
    {
        return true;
    }
    if(getDistance(myAvgCreeppos, myFlag) < ENGAGE_DISTANCE && defencebool)
    {
        defencebool = false;
        return false;
    }
    if((getDistance(enAvgCreeppos, myFlag) < getDistance(myAvgCreeppos, myFlag) && !creepsActivlyEngagingEnemy) || ((getDistance(enAvgCreeppos, myFlag) < 30 && getDistance(myAvgCreeppos, myFlag) > 25) && !creepsActivlyEngagingEnemy))
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
    if(!enemyUsingQuadSquads) // enemy not using quadsquads
    {
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
    }
    else
    {
        if(enAttk.length > 0)
        {
            return enAttk[0];
        }
        if(enheal.length > 0)
        {
            return enheal[0];
        }
        if(enranger.length > 0)
        {
            return enranger[0];
        }
    }
    return enemiesInRange[0];
};

function getcreephealthPercentage(creep)
{
    return (creep.hitsMax / 100) * creep.hits;
}

function graddePosition(p)
{
    var positon = {
        "x": p[0],
        "y": p[1]
    };
    var enemyDamagePotential = 0;
    var myHealPotential = 0;
    var myDamagePotential = 0;
    var enemiesInCloseRange = enCreeps.filter(i => getDistance(i, positon) == 1);
    for(var i = 0; i < enemiesInCloseRange.length; i++)
    {
        if(enemiesInCloseRange[i].body.some(i => i.type === ATTACK))
        {
            var count = 0;
            for(var j = 0; j < enemiesInCloseRange[i].body.length; ++j)
            {
                if(enemiesInCloseRange[i].body[j] == ATTACK)
                {
                    count++;
                }
            }
            enemyDamagePotential = +30 * count;
        }
    }
    var enemiesInCloseRange = enCreeps.filter(i => getDistance(i, positon) < 4);
    for(var i = 0; i < enemiesInCloseRange.length; i++)
    {
        if(enemiesInCloseRange[i].body.some(i => i.type === RANGED_ATTACK))
        {
            var count = 0;
            for(var j = 0; j < enemiesInCloseRange[i].body.length; ++j)
            {
                if(enemiesInCloseRange[i].body[j] == RANGED_ATTACK)
                {
                    count++;
                }
            }
            enemyDamagePotential = +7 * count;
        }
    }
    var healersInCloseRange = myCreeps.filter(i => getDistance(i, positon) < 4);
    for(var i = 0; i < healersInCloseRange.length; i++)
    {
        if(healersInCloseRange[i].body.some(i => i.type === HEAL))
        {
            var count = 0;
            for(var j = 0; j < healersInCloseRange[i].body.length; ++j)
            {
                if(healersInCloseRange[i].body[j] == HEAL)
                {
                    count++;
                }
            }
            myHealPotential = +12 * count;
        }
    }
    return enemyDamagePotential - ((myHealPotential));
}

function getAllMovePositions(creep)
{
    var a = [];
    for(var i = 0; i < movePositionArray.length; i++)
    {
        var positon = {
            "x": movePositionArray[i][0],
            "y": movePositionArray[i][1]
        };
        if(getDistance(creep, positon) == 1 || getDistance(creep, positon) == 0)
        {
            a.push(movePositionArray[i]);
        }
    }
    return a;
}

function getmydamagePotential(i)
{
    var positon = {
        "x": movePositionArray[i][0],
        "y": movePositionArray[i][1]
    };
    var enemiesInRange = enCreeps.filter(i => getDistance(i, positon) < 4);
    var counter = 0;
    counter += (enemiesInRange.filter(i => getDistance(i, positon) == 1).length * 10);
    counter += (enemiesInRange.filter(i => getDistance(i, positon) == 2).length * 4);
    counter += (enemiesInRange.filter(i => getDistance(i, positon) == 3).length);
    if(counter < 10)
    {
        counter = 10;
    }
    return counter;
}

function smartMove(creep)
{
    var myDamagePotential = 0;
    var myRange = 0;
    var movePositions = getAllMovePositions(creep);
    var counter = 999;
    var bestRating = 999999;
    for(var i = 0; i < movePositions.length; i++)
    {
        if(creep.role == "ranger")
        {
            myDamagePotential = getmydamagePotential(i);
        }
        if(creep.role == "attacker")
        {
            var count = 0;
            for(var j = 0; j < creep.body.length; ++j)
            {
                if(creep.body[j] == ATTACK)
                {
                    count++;
                }
            }
            var positon = {
                "x": movePositions[i][0],
                "y": movePositions[i][1]
            };
            var tmp = enCreeps.filter(i => getDistance(i, positon) == 1).length;
            if(tmp.length != 0)
            {
                myDamagePotential += count * 30;
            }
        }
        var currRati9ng = movePositions[i][2] - (myDamagePotential * 5);
        if(currRati9ng < bestRating)
        {
            counter = i;
            bestRating = currRati9ng;
        }
    }
    if(bestRating != 999999 && counter != 999 && myDamagePotential != 0)
    {
        var positon = {
            "x": movePositions[counter][0],
            "y": movePositions[counter][1]
        };
        console.log("smartMove");
        creep.moveTo(positon);
    }
    else
    {
        console.log("smartMovefail", bestRating, "-", counter);
        var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
        creep.moveTo(targets[0]);
    }
}

function checkIfItemIsinArray(item, array)
{
    for(var i = 0; i < array.length; i++)
    {
        if(array[i] === item)
        {
            return true;
        }
    }
    return false;
}

function checkIfInCombatZone(creep)
{
    var array = enCreeps.filter(i => getDistance(i, creep) < 4);
    if(array.length != 0)
    {
        return true;
    }
    else
    {
        return false;
    }
}

function checkIfItemIsinArrayXY(item, array)
{
    for(var i = 0; i < array.length; i++)
    {
        if(array[i][0] === item[0] && array[i][1] === item[1])
        {
            return true;
        }
    }
    return false;
}

function createMoveTables()
{
    var allPositions = [];
    ///////////////////////////////////
    for(var i = 0; i < enCreeps.length; i++)
    {
        for(var x = -3; x < 3; x++)
        {
            for(var y = -3; y < 3; y++)
            {
                if(!checkIfItemIsinArrayXY([enCreeps[i].x + x, enCreeps[i].y + y], allPositions))
                {
                    allPositions.push([enCreeps[i].x + x, enCreeps[i].y + y, graddePosition([enCreeps[i].x + x, enCreeps[i].y + y])]); // cehck first if its aolreayd here
                }
            }
        }
    }
    ////////////////////////////////////
    movePositionArray = allPositions;
}

function getState()
{
    var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, myAvgCreeppos) - getDistance(b, myAvgCreeppos));
    var mycreepsclosetoenflag = myCreeps.filter(i => getDistance(i, enFlag) <= 10);
    var topCorridor = {
        "x": 65,
        "y": 35
    };
    var bottomCorridor = {
        "x": 35,
        "y": 65
    };
    var enemysnearChokePointstop = enCreeps.filter(i => getDistance(i, topCorridor) <= 12);
    var enemysnearChokePointsbottom = enCreeps.filter(i => getDistance(i, bottomCorridor) <= 12);
    if(mycreepsclosetoenflag.length > 3 && !creepsActivlyEngagingEnemy)
    {
        currentState = "chargeFlagDisordered";
    }
    else if(getDistance(enFlag, myAvgCreeppos) < 12)
    {
        currentState = "chargeFlagDisordered";
    }
    else if(!creepsActivlyEngagingEnemy && (enemysnearChokePointstop.length > 3 && getDistance(myAvgCreeppos, topCorridor) < 10) || (enemysnearChokePointsbottom.length > 3 && getDistance(myAvgCreeppos, bottomCorridor) < 10))
    {
        currentState = "enemyDefendingChokePoint";
    }
    else if((currentState == "FullEngage" || currentState == "MyCreepsWellGroupedOrCloseToEnemy") && enTower != undefined && getDistance(myAvgCreeppos, enTower) < 30)
    {
        currentState = "disEngage";
    }
    else if(decideToMoveThroughSwampCorridor())
    {
        currentState = "moveThroughCorridor";
    }
    else if(getTime() > FinalFight && enCreeps.length < 4)
    {
        currentState = "chargeAtEnFlag";
    }
    else if(IsEnemyDefendingBaseACTUAL || (enCreeps == undefined || enCreeps.length < 2) && getTime() < FinalFight && enCreeps.length > 6)
    {
        currentState = "findParts";
    }
    else if(IsEnemyDefendingInAdvantageousPositionACTUAL && getDistance(targets[0], myAvgCreeppos) > ENGAGE_DISTANCE)
    {
        currentState = "enemyDefendingRally";
    }
    else if((getTime() > FinalFight || (!IsEnemyDefendingInAdvantageousPositionACTUAL || getDistance(targets[0], myAvgCreeppos) < 10)) && distanceBetweenGroups < 15 || (distanceBetweenGroups < 25 && (getAverageDistanceBetweenCreepsENACTUAL - 1 > getAverageDistanceBetweenCreepsMYACTUAL || getDistance(targets[0], myAvgCreeppos) < 10 || getAverageDistanceBetweenCreepsMYACTUAL == 1 || getAverageDistanceBetweenCreepsMYACTUAL == 2)))
    {
        currentState = "MyCreepsWellGroupedOrCloseToEnemy";
    }
    else if((getTime() > FinalFight || (!IsEnemyDefendingInAdvantageousPositionACTUAL || getDistance(targets[0], myAvgCreeppos) < 10)) && getAverageDistanceBetweenCreepsMYACTUAL < getAverageDistanceBetweenCreepsENACTUAL || getAverageDistanceBetweenCreepsMYACTUAL == 1 || getAverageDistanceBetweenCreepsMYACTUAL == 2)
    {
        currentState = "MyCreepsWellGroupedAndNotCloseToEnemy";
    }
    else if((getTime() > FinalFight || (!IsEnemyDefendingInAdvantageousPositionACTUAL || getDistance(targets[0], myAvgCreeppos) < 10)) && getAverageDistanceBetweenCreepsMYACTUAL >= getAverageDistanceBetweenCreepsENACTUAL && !IsEnemyDefendingBaseACTUAL)
    {
        currentState = "MyCreepsNotWellGroupedAndEnemyNotDefendingBase";
    }
    else if(creep.healer == 999 && getTime() > FinalFight)
    {
        currentState = "sitOnFlag";
    }
    else if(checkForActiveEngagements())
    {
        creepsActivlyEngagingEnemy = true;
        currentState = "FullEngage";
    }
    else
    {
        currentState = "unbound";
    }
    if(NeedDefence())
    {
        currentState = "defend";
    }
}

function basicCreepCombarIntents(creep)
{
    //   creep.role= "ranger";creep.role= "healer";  creep.role= "attacker";
    var enemiesInRange = enCreeps.filter(i => getDistance(i, creep) <= 3);
    if(enemiesInRange.length != 0)
    {
        creep.engaged = true;
    }
    else
    {
        creep.engaged = false;
    }
    if(creep != undefined && creep.body != undefined && creep.body.length != 0)
    {
        if(creep.role == "healer") // todo change to role in memory
        {
            var healTargets = myCreeps.filter(i => getDistance(i, creep) <= 1).filter(i => i.hits + 48 <= i.hitsMax).sort((a, b) => getcreephealthPercentage(a) - getcreephealthPercentage(b));
            if(healTargets.length != 0)
            {
                creep.heal(healTargets[0]);
            }
            else
            {
                var healTargets = myCreeps.filter(i => getDistance(i, creep) <= 3).filter(i => i.hits + 16 <= i.hitsMax).sort((a, b) => getcreephealthPercentage(a) - getcreephealthPercentage(b));
                if(healTargets.length != 0)
                {
                    creep.rangedHeal(healTargets[0]);
                }
                else
                {
                    creep.heal(creep);
                }
            }
        }
        if(creep.role == "attacker")
        {
            var enemiesInRange = enCreeps.filter(i => getDistance(i, creep) <= 1);
            if(enemiesInRange.length != 0)
            {
                creep.attack(decideBestTarget(creep, 1));
            }
            else
            {
                if(enTower != undefined)
                {
                    var tmp = getDistance(enTower, creep);
                    if(tmp < 1)
                    {
                        creep.attack(enTower);
                    }
                }
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
            else
            {
                if(enTower != undefined)
                {
                    var tmp = getDistance(enTower, creep);
                    if(tmp < 4)
                    {
                        creep.rangedAttack(enTower);
                    }
                }
            }
        }
    }
}

function basicALLCreep(creep)
{
    basicCreepCombarIntents(creep);
    var creepState = currentState;
    if(enCreeps.length + 4 < myCreeps.length && creep.healer == 999 && getTime() < FinalFight)
    {
        creepState = "defend";
    }
    if(creepState == "defend")
    {
        //  flee(creep, targets, 6)
        if(creepsActivlyEngagingEnemy)
        {
            smartMove(creep);
        }
        else
        {
            creep.moveTo(myFlag);
        }
    }
    if(creepState == "moveThroughCorridor")
    {
        var topCorridor = {
            "x": 65,
            "y": 35
        };
        var bottomCorridor = {
            "x": 35,
            "y": 65
        };
        if(getDistance(myAvgCreeppos, topCorridor) < 15 && getDistance(enAvgCreeppos, enFlag) < getDistance(myAvgCreeppos, enFlag))
        {
            creep.moveTo(enFlag,
            {
                ignoreCreeps: true
            });
        }
        if(getDistance(myAvgCreeppos, bottomCorridor) < 15 && getDistance(enAvgCreeppos, myFlag) < getDistance(myAvgCreeppos, myFlag))
        {
            creep.moveTo(myFlag,
            {
                ignoreCreeps: true
            });
        }
        if(getDistance(myAvgCreeppos, topCorridor) < 15 && getDistance(enAvgCreeppos, enFlag) > getDistance(myAvgCreeppos, enFlag))
        {
            creep.moveTo(myFlag,
            {
                ignoreCreeps: true
            });
        }
        if(getDistance(myAvgCreeppos, bottomCorridor) < 15 && getDistance(enAvgCreeppos, myFlag) > getDistance(myAvgCreeppos, myFlag))
        {
            creep.moveTo(enFlag,
            {
                ignoreCreeps: true
            });
        }
    }
    if(creepState == "enemyDefendingChokePoint")
    {
        creep.moveTo(myrallyppoint);
    }
    if(creepState == "disEngage")
    {
        if(!checkIfInCombatZone(creep))
        {
            creep.moveTo(myFlag);
        }
        else
        {
            if(getTime() % 2 == 0)
            {
                creep.moveTo(myAvgCreeppos);
            }
            else
            {
                creep.moveTo(myFlag);
            }
        }
    }
    var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
    if(creepState == "FullEngage")
    {
        if(checkIfInCombatZone(creep))
        {
            smartMove(creep);
        }
        else
        {
            creep.moveTo(targets[0]);
        }
    }
    if(creepState == "chargeFlagDisordered")
    {
        creep.moveTo(enFlag);
    }
    if(creepState == "findParts")
    {
        FindParts(creep, "attack");
    }
    if(creepState == "enemyDefendingRally")
    {
        creep.moveTo(myrallyppoint);
    }
    if(creepState == "MyCreepsWellGroupedOrCloseToEnemy")
    {
        if(checkIfInCombatZone(creep))
        {
            smartMove(creep);
        }
        else
        {
            creep.moveTo(targets[0]);
        }
    }
    if(creepState == "MyCreepsWellGroupedAndNotCloseToEnemy")
    {
        var targets = enCreeps.filter(i => true).sort((a, b) => getDistance(a, creep) - getDistance(b, creep));
        creep.moveTo(targets[0]);
    }
    if(creepState == "MyCreepsNotWellGroupedAndEnemyNotDefendingBase")
    {
        creep.moveTo(myAvgCreeppos);
    }
    if(creepState == "chargeAtEnFlag")
    {
        creep.moveTo(enFlag);
    }
    if(getcreephealthPercentage(creep) < 55 && creepState != "chargeFlagDisordered" && creepState != "chargeAtEnFlag")
    {
        creep.moveTo(myFlag);
    }
    if(creepState == "unbound")
    {
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
        if(getTerrainAt(myCreeps[i].x, myCreeps[i].y) == TERRAIN_SWAMP && getDistance(enCreeps[i], enFlag) > 5 && getDistance(enCreeps[i], myFlag) > 5)
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
            return {
                "x": 80,
                "y": 80
            };
        }
        if(enFlag.x == 97 && enFlag.y == 97)
        {
            return {
                "x": 20,
                "y": 20
            };
        }
    }
}

function detectQuadSqauds(arr)
{
    var creepArry = [];
    var detectedQuadsmembers = 0;
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
        var count = 0;
        if(getDistance(creepArry[i], myFlag) > 6 && getDistance(creepArry[i], enFlag) > 6)
        {
            for(var j = 0; j < creepArry.length; j++)
            {
                if(getDistance(creepArry[j], creepArry[i]) == 1)
                {
                    count++;
                }
            }
        }
        if(count == 3)
        {
            detectedQuadsmembers++;
        }
    }
    if(detectedQuadsmembers == 12)
    {
        enemyUsingQuadSquads = true;
        return 3;
    }
    if(detectedQuadsmembers == 8)
    {
        enemyUsingQuadSquads = true;
        return 2;
    }
    if(detectedQuadsmembers == 4)
    {
        return 1;
    }
    return 0;
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
                if(getDistance(creepArry[j], myFlag) > 6 && getDistance(creepArry[j], enFlag) > 6 && getDistance(creepArry[i], creepArry[j]) < 10)
                {
                    averageDistance += getDistance(creepArry[i], creepArry[j]);
                    count++;
                }
            }
        }
    }
    var a = detectQuadSqauds(arr);
    if(count > 0 && a == 0)
    {
        return Math.floor(averageDistance / count);
    }
    else
    {
        return 2;
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

function AssignRoles()
{
    myCreeps.forEach(creep =>
    {
        creep.engaged = false;
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
        basicALLCreep(Attackers[i]);
    }
    for(var i = 0; i < rangers.length; i++)
    {
        basicALLCreep(rangers[i]);
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
