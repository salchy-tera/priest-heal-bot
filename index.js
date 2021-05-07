

module.exports = function SalchyHealBot(script) {


	let config= reloadModule('./config.js');
	
	let enabled = config[0].enabled;
	let heal_everyone = config[0].heal_everyone;
	let focus_heal_id = config[0].focus_heal_id;
	let healing_immersion_id = config[0].healing_immersion_id;
	let hp_limit = config[0].hp_limit;
	let healing_immersion_max_targets = config[0].healing_immersion_max_targets;
	let focus_heal_max_targets = config[0].focus_heal_max_targets;
	let max_distance = config[0].max_distance;

		
	
	let cid;
	let job;
	let model;
	let myId;
	let priest_job = 6;
	let priest_enab = false;
	
	let party = [];
	let people = [];
	let myPosition;
	let myAngle;
	
	let healing_immersion_cd = false;
	let focus_heal_cd = false;
	
	script.command.add("healbot", () => {	
		enabled = !enabled;
		script.command.message(`Heal Bot is now ${(enabled) ? 'en' : 'dis'}abled.`);	
	});	
	
	
	script.command.add("healbotre", () => {	

		config= reloadModule('./config.js');
		enabled = config[0].enabled;
		heal_everyone = config[0].heal_everyone;
		focus_heal_id = config[0].focus_heal_id;
		healing_immersion_id = config[0].healing_immersion_id;
		hp_limit = config[0].hp_limit;
		healing_immersion_max_targets = config[0].healing_immersion_max_targets;
		focus_heal_max_targets = config[0].focus_heal_max_targets;
		max_distance = config[0].max_distance;
		
		script.command.message('Heal Bot configuration reloaded');	
	})

	script.hook('S_LOGIN', 14, (packet) => {
		cid = packet.gameId;
		myId = packet.playerId;
		model = packet.templateId;
		job = (model - 10101) % 100;
		priest_enab = [priest_job].includes(job);
	})

	script.hook('S_START_COOLTIME_SKILL', 3, packet => {
		if (packet.skill.id == focus_heal_id && priest_enab && enabled) {
			focus_heal_cd = true;
			setTimeout(function () {
				focus_heal_cd = false;
			}, packet.cooldown);
		}	
		if (packet.skill.id == healing_immersion_id && priest_enab && enabled) {
			healing_immersion_cd = true;
			setTimeout(function () {
				healing_immersion_cd = false;
			}, packet.cooldown);
		}		
	})
	
	script.hook('C_PLAYER_LOCATION', 5, packet => {
			myPosition = packet.loc;
			myAngle = packet.w;
	})
	script.hook('S_SPAWN_ME', 3, packet => {
			myPosition = packet.loc;
			myAngle = packet.w;
	})	
	

	script.hook('S_PARTY_MEMBER_LIST', 7, (packet) => {
		
		const copy = party;
		party = packet.members.filter(m => m.playerId != myId);
		if (copy) {
			for (let i = 0; i < party.length; i++) {
				const copyMember = copy.find(m => m.playerId == party[i].playerId);
				if (copyMember) {
					party[i].gameId = copyMember.gameId;
					if (copyMember.loc) party[i].loc = copyMember.loc;
				}
			}
		}
	})
	script.hook('S_LEAVE_PARTY', 1, (packet) => {
		party = [];
	})
	script.hook('S_LEAVE_PARTY_MEMBER', 2, (packet) => {
		party = party.filter(m => m.playerId != packet.playerId);
	})
	script.hook('S_LOGOUT_PARTY_MEMBER', 1, (packet) => {
		let member = party.find(m => m.playerId === packet.playerId);
		if (member) member.online = false;
	})
	script.hook('S_BAN_PARTY_MEMBER', 1, (packet) => {
		party = party.filter(m => m.playerId != packet.playerId);
	})

	script.hook('S_SPAWN_USER', 16, (packet) => {
		if (party.length != 0) {
			let member = party.find(m => m.playerId == packet.playerId);
			if (member) {
				member.gameId = packet.gameId;
				member.loc = packet.loc;
				member.alive = packet.alive;
				member.hpP = (packet.alive ? 100 : 0);
				return;
			}
		}
		people.push({
			gameId: packet.gameId,
			loc: packet.loc,
			playerId: packet.playerId,
			hpP: packet.alive ? 100 : 0
		})
	})
	script.hook('S_USER_LOCATION', 5, (packet) => {
		let member = party.find(m => m.gameId === packet.gameId);
		if (member) member.loc = packet.loc;
		let jugador = people.find(m => m.gameId === packet.gameId);
		if (jugador) jugador.loc = packet.loc;
	})

	script.hook('S_PARTY_MEMBER_CHANGE_HP', 4, packet => {
		if(!priest_enab) return;
		if(!enabled) return;
		if (myId == packet.playerId) return;
		if(heal_everyone) return;
		let member = party.find(m => m.playerId === packet.playerId);
		if (member) {
			member.hpP = (Number(packet.currentHp) / Number(packet.maxHp)) * 100;
		
			if(member.hpP <= hp_limit) {
				
				if(focus_heal_cd && healing_immersion_cd) return;
				let skill_to_cast = healing_immersion_cd ? focus_heal_id : healing_immersion_id;
				let max_targets = healing_immersion_cd ? focus_heal_max_targets : healing_immersion_max_targets;
				let targets_to_heal = [];
				if ((member.loc.dist3D(myPosition) / 25) <= max_distance) targets_to_heal.push({ gameId: member.gameId })
				let packet_heal = {
						skill: {
							reserved: 0,
							npc: false,
							type: 1,
							huntingZoneId: 0,
							id: skill_to_cast
						},
						w: myAngle,
						loc: {
							x: myPosition.x,
							y: myPosition.y,
							z: myPosition.z
						},
						dest: { x: 0, y: 0, z: 0 },
						unk: false,
						moving: true,
						continue: true,
						target: member.gameId,
						unk2: false
					}
				let packet_shoot = {
						skill: {
							reserved: 0,
							npc: false,
							type: 1,
							huntingZoneId: 0,
							id: skill_to_cast + 10
						},
						w: myAngle,
						loc: {
							x: myPosition.x,
							y: myPosition.y,
							z: myPosition.z
						},
						dest: { x: 0, y: 0, z: 0 },
						unk: false,
						moving: true,
						continue: true,
						target: member.gameId,
						unk2: false
					}
				script.toServer('C_START_SKILL', 7, packet_heal);
				if(targets_to_heal.length < max_targets) {
					for (let i = 0, n = party.length; i < n; i++) {
						if(party[i].playerId == myId) continue;
						if(party[i].playerId == packet.playerId) continue;
						if((party[i].loc.dist3D(myPosition) / 25) > max_distance) continue;
						targets_to_heal.push({ gameId: party[i].gameId })
						if(targets_to_heal.length == max_targets) break;
					}
				}
				for (let i = 0, n = targets_to_heal.length; i < n; i++) { 
					script.send('C_CAN_LOCKON_TARGET', 3, {target: targets_to_heal[i].gameId, skill: skill_to_cast});
				}
				setTimeout(() => {
					script.send('C_START_SKILL', 7, packet_shoot);
				}, 10);									
					
			
			}
	
		}
	})

	script.hook('S_USER_LOCATION', 5, packet => {
		let member = party.find(m => m.gameId === packet.gameId);
		if (member) member.loc = packet.loc;
		let jugador = people.find(m => m.gameId === packet.gameId);
		if (jugador) jugador.loc = packet.loc;
		if(priest_enab && enabled && heal_everyone && (cid != packet.gameId)) {
			let person = people.find(m => m.gameId === packet.gameId);
			if (person) {
				//person.hpP = (Number(packet.currentHp) / Number(packet.maxHp)) * 100;
			
				//if(person.hpP <= hp_limit) {
					
					if(focus_heal_cd) return;
					let skill_to_cast = focus_heal_id;
					let max_targets = focus_heal_max_targets;
					let targets_to_heal = [];
					if ((packet.loc.dist3D(myPosition) / 25) <= max_distance) targets_to_heal.push({ gameId: person.gameId }) 
					let packet_heal = {
							skill: {
								reserved: 0,
								npc: false,
								type: 1,
								huntingZoneId: 0,
								id: skill_to_cast
							},
							w: myAngle,
							loc: {
								x: myPosition.x,
								y: myPosition.y,
								z: myPosition.z
							},
							dest: { x: 0, y: 0, z: 0 },
							unk: false,
							moving: true,
							continue: true,
							target: person.gameId,
							unk2: false
						}
					let packet_shoot = {
							skill: {
								reserved: 0,
								npc: false,
								type: 1,
								huntingZoneId: 0,
								id: skill_to_cast + 10
							},
							w: myAngle,
							loc: {
								x: myPosition.x,
								y: myPosition.y,
								z: myPosition.z
							},
							dest: { x: 0, y: 0, z: 0 },
							unk: false,
							moving: true,
							continue: true,
							target: person.gameId,
							unk2: false
						}
						
					script.toServer('C_START_SKILL', 7, packet_heal);
					if(targets_to_heal.length < max_targets) {
						for (let i = 0, n = people.length; i < n; i++) {
							if(people[i].gameId == packet.gameId) continue;
							if((people[i].loc.dist3D(myPosition) / 25) > max_distance) continue;
							targets_to_heal.push({ gameId: people[i].gameId })
							if(targets_to_heal.length == max_targets) break;
						}
					}
					for (let i = 0, n = targets_to_heal.length; i < n; i++) { 
						script.send('C_CAN_LOCKON_TARGET', 3, {target: targets_to_heal[i].gameId, skill: skill_to_cast});
					}
					setTimeout(() => {
						script.send('C_START_SKILL', 7, packet_shoot);
					}, 10);									
				//}
			}
	
		}
	})	
	
	function reloadModule(mod_to_reload){
		delete require.cache[require.resolve(mod_to_reload)]
		console.log("Salchy's HealBot: Reloading " + mod_to_reload + "...");
		return require(mod_to_reload)
	}	


}