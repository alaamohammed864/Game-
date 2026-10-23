import React, { useEffect, useState } from 'react';
import { GameState, ViewTab, BattleReport, BuildingType, UnitType, AIDifficulty } from './types';
import { gameStore } from './game/gameStore';
import { sound } from './audio/soundSystem';
import { Language, t } from './utils/localization';
import { TitleScreen } from './components/TitleScreen';
import { TopBar } from './components/TopBar';
import { SideNav } from './components/SideNav';
import { Globe3D } from './map/Globe3D';
import { Tactical2DMap } from './map/Tactical2DMap';
import { SelectedProvincePanel } from './components/SelectedProvincePanel';
import { BattleReportModal } from './components/BattleReportModal';
import { DiplomacyModal } from './components/DiplomacyModal';
import { ResearchModal } from './components/ResearchModal';
import { IntelModal } from './components/IntelModal';
import { MissionsModal } from './components/MissionsModal';
import { DevConsoleModal } from './components/DevConsoleModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { EventModal } from './components/EventModal';
import { OverviewModal } from './components/OverviewModal';
import { MilitaryModal } from './components/MilitaryModal';
import { EconomyModal } from './components/EconomyModal';
import { WarRoomModal } from './components/WarRoomModal';
import { GeneralsModal } from './components/GeneralsModal';
import { BottomFeed } from './components/BottomFeed';
import { EventNotificationBanner } from './components/EventNotificationBanner';
import { MobileBottomNav } from './components/MobileBottomNav';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(gameStore.getState());
  const [isInTitleScreen, setIsInTitleScreen] = useState<boolean>(true);
  const [lang, setLang] = useState<Language>('ar');
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [activeTab, setActiveTab] = useState<ViewTab>('OVERVIEW');
  const [isNavCollapsed, setIsNavCollapsed] = useState<boolean>(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [inspectedBattle, setInspectedBattle] = useState<BattleReport | null>(null);
  const [isDevConsoleOpen, setIsDevConsoleOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [activeEventIndex, setActiveEventIndex] = useState<number>(0);
  const [dismissedToastEventId, setDismissedToastEventId] = useState<string | null>(null);

  // Subscribe to game store updates
  useEffect(() => {
    const unsubscribe = gameStore.subscribe(() => {
      setGameState({ ...gameStore.getState() });
    });
    return () => unsubscribe();
  }, []);

  // Update HTML document dir and lang for Arabic RTL support
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Global Keyboard Shortcuts (Space for pause, Ctrl+Shift+D for Dev console)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Dev console with Ctrl+Shift+D
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsDevConsoleOpen(prev => !prev);
        sound.playSelect();
      }
      // Space for Pause/Play
      if (e.code === 'Space' && !isInTitleScreen && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        gameStore.togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInTitleScreen]);

  const handleStartGame = (difficulty: AIDifficulty, countryId: string, isSandbox: boolean) => {
    gameStore.createNewGame(difficulty, countryId);
    if (isSandbox) {
      gameStore.toggleDevMode();
      gameStore.setUnlimitedResourcesDev(true);
    }
    // Select capital province by default
    const playerCapital = gameStore.getState().countries[countryId]?.capitalProvinceId;
    if (playerCapital) {
      setSelectedProvinceId(playerCapital);
    }
    setIsInTitleScreen(false);
  };

  const handleToggleLanguage = () => {
    const nextLang = lang === 'en' ? 'ar' : 'en';
    setLang(nextLang);
    sound.playClick();
  };

  const handleToggleMute = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleSelectProvince = (id: string) => {
    setSelectedProvinceId(id);
    sound.playSelect();
  };

  // Resolve dynamic world event choices
  const handleResolveEventOption = (optionIndex: number, eventIndex: number = 0) => {
    const activeEvent = gameState.activeEvents[eventIndex] || gameState.activeEvents[0];
    if (!activeEvent) return;
    const option = activeEvent.options[optionIndex];
    const player = gameState.countries[gameState.playerCountryId];

    if (option && player) {
      if (option.cost) {
        Object.entries(option.cost).forEach(([res, val]) => {
          player.resources[res as keyof typeof player.resources] = Math.max(0, (player.resources[res as keyof typeof player.resources] || 0) - (val || 0));
        });
      }
      if (option.reward) {
        Object.entries(option.reward).forEach(([res, val]) => {
          player.resources[res as keyof typeof player.resources] = (player.resources[res as keyof typeof player.resources] || 0) + (val || 0);
        });
      }
      if (option.stabilityDelta) {
        Object.values(gameState.provinces)
          .filter(p => p.countryId === gameState.playerCountryId)
          .forEach(p => {
            p.stability = Math.max(10, Math.min(100, p.stability + option.stabilityDelta!));
          });
      }
      sound.playSelect();
    }

    // Dismiss this resolved event from the queue
    gameState.activeEvents.splice(eventIndex, 1);
    if (gameState.activeEvents.length === 0) {
      setIsEventModalOpen(false);
    } else {
      setActiveEventIndex(prev => Math.min(prev, gameState.activeEvents.length - 1));
    }
    setGameState({ ...gameState });
  };

  // If in Title Screen, display full Title Game Shell
  if (isInTitleScreen) {
    return (
      <TitleScreen
        onStartGame={handleStartGame}
        lang={lang}
        onToggleLanguage={handleToggleLanguage}
      />
    );
  }

  const player = gameState.countries[gameState.playerCountryId];
  const selectedProvince = selectedProvinceId ? gameState.provinces[selectedProvinceId] : null;

  // Active unread alerts
  const availableMissionsCount = gameState.missions.filter(m => m.isCompleted && !m.isClaimed).length;
  const recentBattle = gameState.recentBattles[0];

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative select-none">
      {/* Top HUD Navigation Bar */}
      <TopBar
        state={gameState}
        activeEventsCount={gameState.activeEvents.length}
        onOpenDirectives={() => setIsEventModalOpen(true)}
        onTogglePause={() => gameStore.togglePause()}
        onSetSpeed={(s) => gameStore.setSpeed(s)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenDevConsole={() => setIsDevConsoleOpen(true)}
        lang={lang}
        onToggleLanguage={handleToggleLanguage}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(v => v === '3D' ? '2D' : '3D')}
      />

      {/* Non-intrusive Floating Directive Alert Banner (Never blocks gameplay) */}
      {gameState.activeEvents.length > 0 && !isEventModalOpen && (() => {
        const latestEvent = gameState.activeEvents[gameState.activeEvents.length - 1];
        if (latestEvent && latestEvent.id !== dismissedToastEventId) {
          return (
            <EventNotificationBanner
              event={latestEvent}
              onOpenEvent={(ev) => {
                const idx = gameState.activeEvents.findIndex(e => e.id === ev.id);
                setActiveEventIndex(idx >= 0 ? idx : 0);
                setIsEventModalOpen(true);
                setDismissedToastEventId(ev.id);
              }}
              onDismissToast={() => setDismissedToastEventId(latestEvent.id)}
              lang={lang}
            />
          );
        }
        return null;
      })()}

      {/* Main Command Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left SideNav Tabs */}
        <SideNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            sound.playClick();
          }}
          isCollapsed={isNavCollapsed}
          onToggleCollapse={() => setIsNavCollapsed(!isNavCollapsed)}
          lang={lang}
          unreadBattlesCount={gameState.recentBattles.length}
          availableMissionsCount={availableMissionsCount}
        />

        {/* Central Viewport (3D Orbital Globe or 2D Theatre Command) */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-950">
          {viewMode === '3D' ? (
            <Globe3D
              provinces={gameState.provinces}
              countries={gameState.countries}
              selectedProvinceId={selectedProvinceId}
              onSelectProvince={handleSelectProvince}
              playerCountryId={gameState.playerCountryId}
              isPaused={gameState.isPaused}
              recentBattles={gameState.recentBattles}
              currentTurn={gameState.currentTurn}
            />
          ) : (
            <Tactical2DMap
              provinces={gameState.provinces}
              countries={gameState.countries}
              selectedProvinceId={selectedProvinceId}
              onSelectProvince={handleSelectProvince}
              playerCountryId={gameState.playerCountryId}
              recentBattles={gameState.recentBattles}
              currentTurn={gameState.currentTurn}
            />
          )}

          {/* Right Selected Province Dossier & Action Panel */}
          {selectedProvince && (
            <SelectedProvincePanel
              province={selectedProvince}
              countries={gameState.countries}
              provinces={gameState.provinces}
              playerCountryId={gameState.playerCountryId}
              onClose={() => setSelectedProvinceId(null)}
              onQueueBuilding={(provId, type) => gameStore.queueBuilding(provId, type)}
              onQueueMilitary={(provId, type, count) => gameStore.queueMilitary(provId, type, count)}
              onLaunchAttack={(fromId, targetId, unitIds) => {
                const battle = gameStore.launchPlayerAttack(fromId, targetId, unitIds);
                if (battle) setInspectedBattle(battle);
              }}
              onDeployRecon={(provId) => gameStore.conductSatelliteRecon(provId)}
              lang={lang}
            />
          )}

          {/* Bottom Alert Ticker & Notifications Drawer */}
          <BottomFeed
            notifications={gameState.notifications}
            onSelectProvince={handleSelectProvince}
            onOpenDirectives={() => setIsEventModalOpen(true)}
            lang={lang}
          />
        </main>
      </div>

      {/* Modal Dialogs for SideNav tabs */}
      {activeTab === 'DIPLOMACY' && (
        <DiplomacyModal
          countries={gameState.countries}
          playerCountryId={gameState.playerCountryId}
          onClose={() => setActiveTab('OVERVIEW')}
          onSendProposal={(targetId, prop) => gameStore.sendDiplomaticProposal(targetId, prop)}
          onDeclareWar={(targetId) => gameStore.declareWar(targetId)}
          lang={lang}
        />
      )}

      {activeTab === 'RESEARCH' && player && (
        <ResearchModal
          player={player}
          onClose={() => setActiveTab('OVERVIEW')}
          onStartResearch={(techId) => gameStore.startResearch(techId)}
          lang={lang}
        />
      )}

      {activeTab === 'INTELLIGENCE' && (
        <IntelModal
          intelReports={gameState.intelReports}
          countries={gameState.countries}
          provinces={gameState.provinces}
          onClose={() => setActiveTab('OVERVIEW')}
          lang={lang}
        />
      )}

      {activeTab === 'MISSIONS' && (
        <MissionsModal
          missions={gameState.missions}
          onClaimReward={(mId) => gameStore.claimMissionReward(mId)}
          onClose={() => setActiveTab('OVERVIEW')}
          lang={lang}
        />
      )}

      {activeTab === 'MILITARY' && player && (
        <MilitaryModal
          player={player}
          provinces={gameState.provinces}
          militaryQueue={gameState.militaryQueue}
          onClose={() => setActiveTab('OVERVIEW')}
          lang={lang}
        />
      )}

      {activeTab === 'GENERALS' && player && (
        <GeneralsModal
          player={player}
          provinces={gameState.provinces}
          onAssignGeneral={(gId, pId) => gameStore.assignGeneral(gId, pId)}
          onPromoteGeneral={(gId) => gameStore.promoteGeneral(gId)}
          onLaunchBallisticMissile={(targetId) => gameStore.launchBallisticMissile(targetId)}
          onClose={() => setActiveTab('OVERVIEW')}
          lang={lang}
        />
      )}

      {activeTab === 'ECONOMY' && player && (
        <EconomyModal
          player={player}
          provinces={gameState.provinces}
          countries={gameState.countries}
          marketPrices={gameState.tradeMarketPrices}
          onExecuteTrade={(res, amt, isBuy) => gameStore.tradeResource(res, amt, isBuy)}
          onClose={() => setActiveTab('OVERVIEW')}
          lang={lang}
        />
      )}

      {activeTab === 'WAR_ROOM' && (
        <WarRoomModal
          battles={gameState.recentBattles}
          countries={gameState.countries}
          onInspectBattle={(report) => setInspectedBattle(report)}
          onClose={() => setActiveTab('OVERVIEW')}
          lang={lang}
        />
      )}

      {/* Battle Report Modal */}
      {inspectedBattle && (
        <BattleReportModal
          report={inspectedBattle}
          onClose={() => setInspectedBattle(null)}
          lang={lang}
        />
      )}

      {/* Dynamic Geopolitical Directives Modal (Opened on-demand by user via notification or TopBar beacon) */}
      {isEventModalOpen && gameState.activeEvents.length > 0 && (
        <EventModal
          events={gameState.activeEvents}
          activeEventIndex={activeEventIndex}
          onChangeEventIndex={setActiveEventIndex}
          state={gameState}
          onResolveOption={handleResolveEventOption}
          onClose={() => setIsEventModalOpen(false)}
          lang={lang}
        />
      )}

      {/* Developer Console Modal (Ctrl+Shift+D) */}
      {isDevConsoleOpen && (
        <DevConsoleModal
          state={gameState}
          onClose={() => setIsDevConsoleOpen(false)}
          onToggleDevMode={() => gameStore.toggleDevMode()}
          onToggleUnlimitedGold={(en) => gameStore.setUnlimitedGoldDev(en)}
          onToggleUnlimitedResources={(en) => gameStore.setUnlimitedResourcesDev(en)}
          onToggleInstantBuild={(en) => gameStore.setInstantBuildDev(en)}
          onToggleInstantResearch={(en) => gameStore.setInstantResearchDev(en)}
          onToggleFog={() => gameStore.toggleFogOfWarDev()}
          onAddResources={() => gameStore.devAddResources(50000)}
          onCompleteResearch={() => gameStore.devCompleteAllResearch()}
          onSpawnStrikeCorps={(provId) => gameStore.devSpawnStrikeCorps(provId)}
          onAdvanceTurns={(cnt) => gameStore.devAdvanceTurns(cnt)}
          onSwitchCountry={(cId) => gameStore.devSwitchCountry(cId)}
          onTriggerEvent={() => {
            const ev = {
              id: `dev_ev_${Date.now()}`,
              titleKey: 'Simulated Crisis Escalation',
              descKey: 'Developer trigger: A flashpoint military border confrontation has escalated into an international crisis.',
              severity: 'CRISIS' as const,
              options: [
                {
                  label: 'Mobilize National Guard Reserves',
                  description: 'Boost military readiness (+500 Manpower, costs $500).',
                  cost: { money: 500 },
                  reward: { manpower: 500 }
                },
                {
                  label: 'Deploy Emergency Diplomacy Team',
                  description: 'Send envoys to defuse the standoff.'
                }
              ]
            };
            gameState.activeEvents.push(ev);
            gameState.notifications.unshift({
              id: `notif_${ev.id}`,
              turn: gameState.currentTurn,
              type: 'EVENT',
              title: `Directive: ${ev.titleKey}`,
              message: ev.descKey
            });
            setDismissedToastEventId(null);
            setGameState({ ...gameState });
          }}
          onResetWorld={() => {
            gameStore.createNewGame(gameState.activeDifficulty, gameState.playerCountryId);
            setIsDevConsoleOpen(false);
          }}
          lang={lang}
        />
      )}

      {/* Save & Load Modal */}
      {isSaveModalOpen && (
        <SaveLoadModal
          currentState={gameState}
          onLoadState={(loaded) => gameStore.loadSavedState(loaded)}
          onClose={() => setIsSaveModalOpen(false)}
          lang={lang}
        />
      )}

      {/* Mobile Fixed Bottom Navigation Bar (Hidden on iPad and Desktop) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          sound.playClick();
        }}
        lang={lang}
        unreadBattlesCount={gameState.recentBattles.length}
        availableMissionsCount={availableMissionsCount}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenDevConsole={() => setIsDevConsoleOpen(true)}
        isDevMode={gameState.isDevMode}
      />
    </div>
  );
}
