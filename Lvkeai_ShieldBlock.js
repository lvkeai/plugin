/*:
 * @plugindesc v1.00 Block effect.Need: YEP_DamageCore.js，YEP_BuffsStatesCore.js，YEP_CoreEngine.js
 * @author Lvkeai
 * 
 * @help This plugin does not provide plugin commands.
 * 
 * 
 * @param Block animation
 * @desc Block animation.
 * @default 20
 * @param Broken shield animation
 * @desc Broken shield animation.
 * @default 20
 * @param Broken shield
 * @desc The state of punishment for a broken shield.
 * @default 20
 * @param Barrier NOT Block
 * @desc The Barrier will not trigger the block effect.
 * @default false
 * @help  
 * A plug-in that makes the shield more useful,Animation and status should be done by yourself.
 * Set a few states as you like.
 * 1、Broken shield reduces the probability of blocking.<DAMAGE BDRATE: -100>
 * 2、Guard increases the probability of blocking.<DAMAGE BDRATE: +40>
 * 3、Add a broken shield to the axe weapon.<DAMAGE AXENUM: +1>
 * 4、Large shield<DAMAGE BDRATE: +50>,Small shield<DAMAGE BDRATE: +30>,Block damage value<DAMAGE BDR: +50>
 * 有什么问题可以来这个帖子留言
 * https://rpg.blue/thread-405054-1-1.html
 * lvkeai@sina.com
 *=============================================================================================================
 * Block RATE
 *<DAMAGE BDRATE: +30>
 *<DAMAGE BDRATE: -100>
 * Block damage value：How much damage is prevented（Less than 1,0.1=10%）
 *<DAMAGE BDR: +90>
 * Shield Durability:The shield resists too much damage（More than 5）.Reduce the durability
 *<DAMAGE BNUM: +3>
 * Broken Shield：Each attack reduces the durability of the enemy's shield.
 *<DAMAGE AXENUM: +1>
 */
/*:zh
 * @plugindesc v1.00 格挡效果.需要YEP_DamageCore.js，YEP_BuffsStatesCore.js，YEP_CoreEngine.js
 * @author Lvkeai
 * 
 * @help This plugin does not provide plugin commands.
 * 
 * 
 * @param Block animation
 * @desc 格挡动画.
 * @default 20
 * @param Broken shield animation
 * @desc 破盾动画.
 * @default 20
 * @param Broken shield
 * @desc 破盾状态.
 * @default 20
 * @param Barrier NOT Block
 * @desc 力场不会触发格挡效果.
 * @default false
 * @help  
 * 让盾牌更有用的插件，动画和状态都要自己做。
 * 按自己喜好设定一些状态
 * 1、破盾状态让格挡几率<DAMAGE BDRATE: -100>
 * 2、防御状态让格挡几率增加<DAMAGE BDRATE: +40>
 * 3、给斧头武器增加破盾属性<DAMAGE AXENUM: +1>
 * 4、大盾牌格挡几率<DAMAGE BDRATE: +50>，小盾牌格挡几率<DAMAGE BDRATE: +30>，格挡值<DAMAGE BDR: +50>
 * 有什么问题可以来这个帖子留言
 * https://rpg.blue/thread-405054-1-1.html
 *=============================================================================================================
 * 格挡几率
 *<DAMAGE BDRATE: +30>
 *<DAMAGE BDRATE: -100>
 * 格挡值：抵挡多少伤害（小于1，抵挡百分比）
 *<DAMAGE BDR: +90>
 * 盾牌耐久：抵挡过量伤害（溢出5点或破盾属性）会减少耐久
 *<DAMAGE BNUM: +3>
 * 破盾：每次攻击减少敌方盾牌多少耐久
 *<DAMAGE AXENUM: +1>
 */
 var Imported = Imported || {};
　Imported.Lvkeai_ShieldBlock = true;
var Lvkeai = Lvkeai || {}; 
Lvkeai.Param = Lvkeai.Param || {};
Lvkeai.Parameters = PluginManager.parameters('Lvkeai_ShieldBlock');
Lvkeai.Param.BlockAnimation = Number(Lvkeai.Parameters['Block animation']||0);
Lvkeai.Param.BrokenAnimation = Number(Lvkeai.Parameters['Broken shield animation']);
Lvkeai.Param.Bshield = Number(Lvkeai.Parameters['Broken shield']);
Lvkeai.Param.BNB = String(Lvkeai.Parameters['Barrier NOT Block']);
Lvkeai.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
DataManager.isDatabaseLoaded = function() {
    if (!Lvkeai.DataManager_isDatabaseLoaded.call(this)) return false;
    if (!Lvkeai._loaded_newbdr) {
      this.processDMGNotetags2($dataActors);
      this.processDMGNotetags2($dataClasses);
      this.processDMGNotetags2($dataEnemies);
      this.processDMGNotetags2($dataWeapons);
      this.processDMGNotetags2($dataArmors);
      this.processDMGNotetags2($dataStates);
      Lvkeai._loaded_newbdr = true;
    }
		return true;
};

DataManager.processDMGNotetags2 = function(group) {
  //FUCK新增
  var notebdRate=/<(?:DAMAGE BDRATE):[ ]([\+\-]\d+)>/i;
  var notebdr=/<(?:DAMAGE BDR):[ ]([\+\-]\d+)>/i;
  var notebnum=/<(?:DAMAGE BNUM):[ ]([\+\-]\d+)>/i;
  var noteAxenum=/<(?:DAMAGE AXENUM):[ ]([\+\-]\d+)>/i;
  for (var n = 1; n < group.length; n++) {
		var obj = group[n];
		var notedata = obj.note.split(/[\r\n]+/);

    obj.breakDamageCap = undefined;
    obj.damageCap = undefined;
    obj.healCap = undefined;

		for (var i = 0; i < notedata.length; i++) {
			var line = notedata[i];
			if(line.match(notebdRate)){//格挡几率
				obj.bdRate = parseInt(RegExp.$1);
			}else if(line.match(notebdr)){//格挡信息
				obj.bdr = parseFloat(RegExp.$1);
			}else if(line.match(notebnum)){//格挡信息
				obj.bnum = parseInt(RegExp.$1);
			}else if(line.match(noteAxenum)){//破盾信息
				obj.axenum = parseInt(RegExp.$1);
				console.log("obj.axenum"+obj.axenum)
				
			}
		}
	}
};

Game_BattlerBase.prototype.resetDMGTempValues = function() {
    this._isDMGCapped = undefined;
    this._maximumDamage = undefined;
    this._maximumHealing = undefined;
    this._BdRate=undefined;
	this._bdr=undefined;
	this._axenum=undefined;
};
//计算格挡几率
Game_Actor.prototype.GetBdRate = function() {
	var BdRate=0;
	if (this.actor().bdRate) {
		BdRate+=this.actor().bdRate;
	}
	if (this.currentClass().bdRate){
		BdRate+=this.currentClass().bdRate;
	}
	for (var i = 0; i < this.equips().length; ++i) {
		var equip = this.equips()[i];
		if (equip && equip.bdRate){
			BdRate+=equip.bdRate
		}
	}
	for (var i = 0; i < this.states().length; ++i) {
      var state = this.states()[i];
      if (state && state.bdRate){
			BdRate+=state.bdRate
		}
   }
	return this._BdRate=BdRate;
}
Game_Actor.prototype.isbdr = function() {
	var bdr=0;
	var bnum=0;	
	if (this.actor().bdr) {
		bdr+=this.actor().bdr;
	}
	if (this.currentClass().bdr){
		bdr+=this.currentClass().bdr;
		var bbnum=0;
		try{
			bbnum=parseInt(this.currentClass().bnum)||0;
			if(bbnum==NaN){
				bbnum=0;
			}
		}catch (e) {
                   bbnum=0; 
        }
		bnum+=bbnum;
	}
//	console.log("bdrclass!!!="+bdr);
	for (var i = 0; i < this.equips().length; ++i) {
		var equip = this.equips()[i];
		if (equip && equip.bdr){
			bdr+=equip.bdr
			var bbnum2=0;
		try{
			bbnum2=parseInt(equip.bnum)||0;
			if(bbnum2==NaN){
				bbnum2=0;
			}
		}catch (e) {
                   bbnum2=0; 
        }
			bnum+=bbnum2;
//			console.log(bnum+"bnum调用！！fuck");
		}
	}
	this._bnum=bnum;
	return this._bdr=bdr;
};
Game_Actor.prototype.isaxe = function() {
	var axenum=0;
	
	if (this.actor().axenum) {
		axenum+=this.actor().axenum;
	}
	for (var i = 0; i < this.equips().length; ++i) {
		var equip = this.equips()[i];
		if (equip && equip.axenum){
			axenum+=equip.axenum		
		}
	}
	return this._axenum=axenum;
};
//Game_Enemy===========================
Game_Enemy.prototype.GetBdRate = function() {
	var BdRate=0;
if (this.enemy().bdRate) {
	BdRate=this.enemy().bdRate;
}
for (var i = 0; i < this.states().length; ++i) {
      var state = this.states()[i];
      if (state && state.bdRate){
			BdRate+=state.bdRate
		}
   }
	return this._BdRate=BdRate;
};
Game_Enemy.prototype.isbdr = function() {
	var bdr=0;
	var bnum=0;
if (this.enemy().bdr) {
	bdr=this.enemy().bdr;
	bnum=this.enemy().bnum;
}
for (var i = 0; i < this.states().length; ++i) {
      var state = this.states()[i];
      if (state && state.bdr){
			bdr+=state.bdr
			var bbnum2=0;
		try{
			bbnum2=parseInt(state.bnum)||0;
			if(bbnum2==NaN){
				bbnum2=0;
			}
		}catch (e) {
                   bbnum2=0; 
        }
			bnum+=bbnum2;
//			console.log(bnum+"bnum调用！！fuck");
		}
    }
this._bnum=bnum;
	return this._bdr=bdr;
};
Game_Enemy.prototype.isaxe = function() {
	var axenum=0;
if (this.enemy().axenum) {
	axenum=this.enemy().axenum;
}
	return this._axenum=axenum;
};

Lvkeai.Game_Action_executeDamage = Game_Action.prototype.executeDamage;
Game_Action.prototype.executeDamage = function(target, value) {
    target.GetBdRate();//计算格挡几率
	var thebdr=target._BdRate;
	console.log("格挡几率————"+thebdr)
	target._nowbnum=target._nowbnum||0;
    value = this.onPreDamageStateEffects(target, value);
    value = this.onReactStateEffects(target, value);
    if (this.isPhysical()) {
    	var canbdr=true;
    	var bpv=0;
		var tbp=0;
		if(Lvkeai.Param.BNB==true){
			tbp=target.barrierPoints();
		}
		if(tbp>value){
			canbdr=false;
		}else if(tbp>0&&tbp<value){
			bpv=tbp;
			canbdr=true;
			target._mustbdr=true;
			value=value-bpv;
		}
		if(canbdr==true){//可以格挡
			target.isbdr();
		if (Math.random()*100 < thebdr||target._mustbdr==true) { //格挡
			var bvl = target._bdr;
			if (bvl <= 0) {//没有格挡值没有格挡效果

			} else {
				if(bvl>1){//小于1是百分比减伤
					console.log("伤害="+value+"-格挡值="+bvl);
					if(target._hummer==1){//如果用的是锤子
						bvl=bvl*0.3;
					}
					value = value - bvl; //target.bvl
				}else{
					value=(value*bvl)/100;
				}
				console.log("最终伤害value="+value);
				if (value <=5) {
					if(target._axe>0){
								target._nowbnum+=target._axe;
               if(target._bnum>0){
	               if(target._nowbnum>=target._bnum){
						//盾爆炸
						target.startAnimation(Lvkeai.Param.BrokenAnimation);
						target.addState(Lvkeai.Param.Bshield); 
					            }
                                }
						
						}
					value = 1;//至少一点伤害
				}else{
					//爆盾
					try{
						if(value>5||target._axe>0){
							if(target._axe>0){
								target._nowbnum+=target._axe;
							}else{
								target._nowbnum+=1;
							}
               if(target._bnum>0){
	               if(target._nowbnum>=target._bnum){
						//盾爆炸
						target.startAnimation(Lvkeai.Param.BrokenAnimation);
						target.addState(Lvkeai.Param.Bshield); 
					          }
                    }
						
						}
						console.log(target._nowbnum+"爆盾="+value+"——————"+target._bnum)
					} catch (e) {
                    if (target._bnum) {
                    Yanfly.Util.displayError(e, target._bnum, 'DAMAGE FORMULA ERROR');
                    } else {
                    Yanfly.Util.displayError(e, target._bnum, 'DAMAGE FORMULA ERROR');
                    }
                    }
					
				}
				target.startAnimation(Lvkeai.Param.BlockAnimation);
			}
                
		}
		}
		value+=bpv;
		
    }
    Lvkeai.Game_Action_executeDamage.call(this, target, value);   
    //value = this.onRespondStateEffects(target, value);
    //value = this.onPostDamageStateEffects(target, value);    
};

Game_Action.prototype.makeDamageValue = function(target, critical) {
  var item = this.item();
  var a = this.subject();
  var b = target;
  var user = this.subject();
  var s = $gameSwitches._data;
  var v = $gameVariables._data;
  var baseDamage = this.evalDamageFormula(target);
  var value = baseDamage;
  
  var tbp=0;
	if(Lvkeai.Param.BNB==true){
			tbp=target.barrierPoints();
		}
  try {
  	if(tbp>0&&value>tbp){
  		
  	}else if(tbp>0&&value<tbp){
  		
  	}else{
  		target._mustbdr=false;
  		eval(Yanfly.DMG.DamageFlow);
  	}
	
	if (this.isPhysical()) {
		if(tbp>0){
			if(target._mustbdr){
				if(value>tbp){
				value=value-tbp;
				value *= target.pdr;
				value+=tbp;
				target._mustbdr=false;
				}
			}else{
				if(value>tbp){
				value=value-tbp;
				value *= target.pdr;
				value+=tbp;
				}
			}
		}else{
			value *= target.pdr;
		}
	}else if(this.isMagical()){
		if(tbp>0){
			if(value>tbp){
				value=value-tbp;
				value *= target.mdr;
				value+=tbp;
			}
		}else{
  		value *= target.mdr;
  	}
	}
  } catch (e) {
	  console.log("报错="+e)
    //Yanfly.Util.displayError(e, Yanfly.DMG.DamageFlow, 'DAMAGE FLOW ERROR');
  }
  return Math.round(value);
};

Game_Action.prototype.applyPhysicalRate = function(value, baseDamage, target) {
//  value *= target.pdr;
    return value;
};

Game_Action.prototype.applyMagicalRate = function(value, baseDamage, target) {
//  value *= target.mdr;
    return value;
};