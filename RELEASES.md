# 发版记录

应用版本以 `src-tauri/tauri.conf.json` 的 `version` 为准。商店文案不放进 `src/locales.js`。每种语言单独一套，按下面的微软商店字段填写。

新版本写在最上面。已经提交到商店的那一节不要改。

产品名用已保留的 **HardBreak**。它已经够短，各语言的短标题都填 HardBreak。

截图不放进本文。简体、繁体、英文的图在 `docs/images/`。日文、韩文、德文、法文、西班牙文上架前要另截。

## 微软商店字段

| 字段 | 作用 | 限制 |
|---|---|---|
| 说明 | 告知用户产品功能 | 10000 字符 |
| 此版本新增功能 | 发行说明。首次提交留空 | 1500 字符 |
| 产品功能 | 主要功能的简短摘要，一条一条填 | 最多 20 条，每条 200 字符 |
| 短标题 | 可选的较短名称 | 本产品用 HardBreak |
| 简短描述 | 搜索和列表里的短介绍 | 1000 字符。列表里通常只露出前面约 270 个 |
| 关键字 | 搜索词 | 最多 7 条；每条 40 字符；所有条目里不重复的词最多 21 个 |

## 0.5.0

商店已发布 0.4.0。这一节按提交 0.5.0 来写。

「说明」和「产品功能」写的是 0.5.0 的完整能力。「此版本新增功能」只写相对 0.4.0 的变化：翻页时钟、立即生效、休息提示增至 30 条、五种新语言、不可跳过前的确认、短休眠不再计入工作时间、macOS 只留在菜单栏。

状态：文案稿。提交后补上架日期，之后不要再改这一节。

### 功能清单

- 番茄循环。默认工作 25 分钟、休息 5 分钟。工作 1–120 分钟，休息 1–60 分钟。
- 新时长默认从下一阶段生效。点「立即生效」则从工作阶段按新时长重新计时。
- 休息开始时，每块显示器各出一个全屏休息窗。
- 倒计时可选圆环或翻页时钟，切换后立即生效。
- 每种语言 30 条休息提示，每次休息随机一条。
- 可选的休息前通知：休息前 10 秒发一条系统通知。
- 不可跳过模式。开启前先确认。开启后休息窗盖住所有屏幕，倒计时结束才能回到电脑前。
- 八种界面语言：简体中文、繁体中文、英文、日文、韩文、德文、法文、西班牙文。首次启动跟随系统语言，对不上时用英文。
- 工作阶段的短休眠不计入工作时间；休眠超过一次休息时长，则视为已经休息并回到工作起点。
- 设置只存在本机。没有账号，也不上传数据。
- macOS 只在菜单栏，不进程序坞。

### zh-CN 简体中文

**说明**

HardBreak 是一款桌面番茄钟。工作一段时间后，它会在你的每块屏幕上弹出全屏休息窗，让你真正离开座位。

默认工作 25 分钟、休息 5 分钟。工作时长可在 1–120 分钟之间调整，休息时长可在 1–60 分钟之间调整。新时长默认从下一阶段开始生效；如果想马上使用，点「立即生效」，计时会从工作阶段重新开始。

休息窗有两种倒计时：圆环，或翻页时钟。切换后立即生效。每次休息随机显示一条健康提示，每种语言 30 条。

可以打开休息前通知：休息开始前 10 秒，系统会发一条通知，方便你先保存进度。也可以打开不可跳过模式：休息窗盖住所有屏幕，倒计时结束前不能回到电脑前。开启前会先请你确认。

界面语言有简体中文、繁体中文、英文、日文、韩文、德文、法文和西班牙文。首次启动跟随系统语言，对不上时使用英文。

设置只存在这台电脑上。没有账号，也不上传数据。macOS 上只出现在菜单栏，不进入程序坞。

**此版本新增功能**

- 休息倒计时新增翻页时钟，仍可使用圆环，切换后立即生效
- 改完时长后可点「立即生效」，从工作阶段马上重新计时
- 每种语言的休息提示由 10 条增加到 30 条
- 新增日文、韩文、德文、法文、西班牙文
- 开启不可跳过模式前会先确认
- 工作途中的短时间休眠不再算进工作时间
- macOS 只保留在菜单栏，不再出现在程序坞

**产品功能**

1. 番茄计时，默认工作 25 分钟、休息 5 分钟，自动循环
2. 工作 1–120 分钟、休息 1–60 分钟，可自行调整
3. 点「立即生效」后，从工作阶段按新时长重新计时
4. 休息时每块屏幕都弹出全屏休息窗
5. 倒计时可选圆环或翻页时钟
6. 每种语言 30 条休息提示，随机出现
7. 休息前 10 秒发出系统通知
8. 不可跳过模式会盖住所有屏幕，直到倒计时结束
9. 八种界面语言，首次启动跟随系统语言
10. 设置只存在本机，没有账号，也不上传数据

**短标题**

HardBreak

**简短描述**

工作一段时间，就认真休息。到点后，每块屏幕都会弹出全屏休息窗。

**关键字**

1. 番茄钟
2. 强制休息
3. 久坐提醒
4. 护眼
5. 翻页时钟
6. 多屏幕
7. 专注计时

### zh-TW 繁體中文

**说明**

HardBreak 是一款桌面番茄鐘。工作一段時間後，它會在你的每塊螢幕上彈出全螢幕休息視窗，讓你真正離開座位。

預設工作 25 分鐘、休息 5 分鐘。工作時長可在 1–120 分鐘之間調整，休息時長可在 1–60 分鐘之間調整。新時長預設從下一階段開始生效；若要立刻使用，點「立即生效」，計時會從工作階段重新開始。

休息視窗有兩種倒數：圓環，或翻頁時鐘。切換後立即生效。每次休息隨機顯示一條健康提示，每種語言 30 條。

可以開啟休息前通知：休息開始前 10 秒，系統會發出通知，方便你先儲存進度。也可以開啟不可跳過模式：休息視窗蓋住所有螢幕，倒數結束前不能回到電腦前。開啟前會先請你確認。

介面語言有簡體中文、繁體中文、英文、日文、韓文、德文、法文和西班牙文。第一次啟動時跟隨系統語言，對不上時使用英文。

設定只存在這台電腦上。沒有帳號，也不上傳資料。macOS 上只出現在選單列，不進入程式塢。

**此版本新增功能**

- 休息倒數新增翻頁時鐘，仍可使用圓環，切換後立即生效
- 改完時長後可點「立即生效」，從工作階段馬上重新計時
- 每種語言的休息提示由 10 條增加到 30 條
- 新增日文、韓文、德文、法文、西班牙文
- 開啟不可跳過模式前會先確認
- 工作途中的短時間休眠不再算進工作時間
- macOS 只保留在選單列，不再出現在程式塢

**产品功能**

1. 番茄計時，預設工作 25 分鐘、休息 5 分鐘，自動循環
2. 工作 1–120 分鐘、休息 1–60 分鐘，可自行調整
3. 點「立即生效」後，從工作階段按新時長重新計時
4. 休息時每塊螢幕都彈出全螢幕休息視窗
5. 倒數可選圓環或翻頁時鐘
6. 每種語言 30 條休息提示，隨機出現
7. 休息前 10 秒發出系統通知
8. 不可跳過模式會蓋住所有螢幕，直到倒數結束
9. 八種介面語言，第一次啟動跟隨系統語言
10. 設定只存在本機，沒有帳號，也不上傳資料

**短标题**

HardBreak

**简短描述**

工作一段時間，就認真休息。到點後，每塊螢幕都會彈出全螢幕休息視窗。

**关键字**

1. 番茄鐘
2. 強制休息
3. 久坐提醒
4. 護眼
5. 翻頁時鐘
6. 多螢幕
7. 專注計時

### en English

**说明**

HardBreak is a desktop Pomodoro timer. After you work for a while, it puts a fullscreen break window on every display so you actually step away.

The default rhythm is 25 minutes of work and 5 minutes of rest. Work can be set from 1 to 120 minutes, and rest from 1 to 60. New durations apply at the next phase. Choose Apply Now to restart immediately from the work phase.

The break window can count down with a ring or a flip clock. The choice applies immediately. Each break shows one health tip at random, with 30 tips in every language.

An optional system notification appears 10 seconds before a break, so you can save your work first. No-skip mode covers every display until the countdown ends. HardBreak asks you to confirm before turning that on.

The interface is available in Simplified Chinese, Traditional Chinese, English, Japanese, Korean, German, French, and Spanish. On first launch it follows the system language, and uses English when that language is not available.

Settings stay on this computer. There is no account and nothing is uploaded. On macOS, HardBreak lives in the menu bar and does not appear in the Dock.

**此版本新增功能**

- Flip-clock countdown, alongside the existing ring
- Apply Now restarts the timer from the work phase after you change a duration
- Break tips increased from 10 to 30 in each language
- Japanese, Korean, German, French, and Spanish
- Confirmation before no-skip mode is turned on
- A short sleep during work no longer counts as work time
- On macOS, the app stays in the menu bar and no longer appears in the Dock

**产品功能**

1. Pomodoro cycle, 25 minutes of work and 5 minutes of rest by default
2. Work from 1 to 120 minutes, rest from 1 to 60
3. Apply Now restarts timing from the work phase
4. A fullscreen break window on every display
5. Ring or flip-clock countdown
6. 30 break tips in each language, one at random
7. Optional system notification 10 seconds before a break
8. No-skip mode covers every display until the countdown ends
9. Eight interface languages, following the system language on first launch
10. Settings stay on this computer, with no account and no upload

**短标题**

HardBreak

**简短描述**

Work for a while, then actually rest. When it's time, a fullscreen break window appears on every display.

**关键字**

1. pomodoro
2. forced break
3. eye rest
4. flip clock
5. multi-monitor
6. focus
7. posture

### ja 日本語

**说明**

HardBreak はデスクトップ向けのポモドーロタイマーです。作業時間が終わると、すべての画面に全画面の休憩ウィンドウを表示し、席を離れるきっかけを作ります。

初期設定は作業 25 分、休憩 5 分です。作業は 1～120 分、休憩は 1～60 分の範囲で変えられます。新しい時間は次の段階から反映されます。「今すぐ適用」を押すと、作業段階からすぐに計り直します。

休憩のカウントダウンは円形とめくり時計から選べます。切り替えはすぐに反映されます。休憩のたびに健康のヒントが 1 つ無作為に表示され、各言語に 30 件あります。

休憩の 10 秒前にシステム通知を出すこともできます。作業を保存してから休憩に入れます。スキップ不可モードでは、カウントダウンが終わるまで休憩ウィンドウがすべての画面を覆います。有効にする前に確認を求めます。

表示言語は簡体字中国語、繁体字中国語、英語、日本語、韓国語、ドイツ語、フランス語、スペイン語です。初回起動時はシステムの言語に従い、該当しない場合は英語になります。

設定はこのパソコンの中だけに残ります。アカウントはなく、データは送信されません。macOS ではメニューバーにだけ表示され、Dock には入りません。

**此版本新增功能**

- カウントダウンにめくり時計を追加。円形も引き続き使えます
- 時間を変更したあと「今すぐ適用」で、作業段階からすぐに計り直せます
- 各言語の休憩ヒントを 10 件から 30 件に増やしました
- 日本語、韓国語、ドイツ語、フランス語、スペイン語を追加
- スキップ不可モードを有効にする前に確認します
- 作業中の短いスリープは作業時間に含まれません
- macOS ではメニューバーにだけ残り、Dock には表示されません

**产品功能**

1. ポモドーロ。初期設定は作業 25 分、休憩 5 分で、自動的に繰り返します
2. 作業は 1～120 分、休憩は 1～60 分で調整できます
3. 「今すぐ適用」で、作業段階から新しい時間で計り直します
4. 休憩中はすべての画面に全画面の休憩ウィンドウを出します
5. カウントダウンは円形とめくり時計から選べます
6. 各言語 30 件の休憩ヒントを、無作為に 1 件表示します
7. 休憩の 10 秒前にシステム通知を出せます
8. スキップ不可モードは、カウントダウンが終わるまで全画面を覆います
9. 8 言語に対応し、初回はシステムの言語に従います
10. 設定はこのパソコンだけに残り、アカウントも送信もありません

**短标题**

HardBreak

**简短描述**

しばらく働いたら、きちんと休む。休憩になると、すべての画面に全画面の休憩ウィンドウを出します。

**关键字**

1. ポモドーロ
2. 強制休憩
3. 座りすぎ
4. 眼精疲労
5. めくり時計
6. マルチ画面
7. 集中タイマー

### ko 한국어

**说明**

HardBreak는 데스크톱용 포모도로 타이머입니다. 작업 시간이 끝나면 모든 화면에 전체 화면 휴식 창을 띄워, 자리에서 일어나게 합니다.

기본은 작업 25분, 휴식 5분입니다. 작업은 1–120분, 휴식은 1–60분 사이에서 바꿀 수 있습니다. 새 시간은 다음 단계부터 적용됩니다. 「지금 적용」을 누르면 작업 단계부터 바로 다시 시작합니다.

휴식 카운트다운은 원형 또는 플립 시계입니다. 바꾸면 바로 적용됩니다. 휴식마다 건강 안내가 무작위로 하나 나오며, 언어마다 30개입니다.

휴식 10초 전에 시스템 알림을 받을 수 있어, 진행 중인 일을 먼저 저장할 수 있습니다. 건너뛰기 불가 모드에서는 카운트다운이 끝날 때까지 휴식 창이 모든 화면을 덮습니다. 켜기 전에 확인을 요청합니다.

인터페이스 언어는 중국어 간체, 중국어 번체, 영어, 일본어, 한국어, 독일어, 프랑스어, 스페인어입니다. 처음 실행하면 시스템 언어를 따르고, 해당하지 않으면 영어를 사용합니다.

설정은 이 컴퓨터에만 있습니다. 계정은 없고, 데이터를 올리지 않습니다. macOS에서는 메뉴 막대에만 있으며 Dock에는 나타나지 않습니다.

**此版本新增功能**

- 카운트다운에 플립 시계를 추가했습니다. 원형도 그대로 사용할 수 있습니다
- 시간을 바꾼 뒤 「지금 적용」으로 작업 단계부터 바로 다시 시작합니다
- 언어마다 휴식 안내를 10개에서 30개로 늘렸습니다
- 일본어, 한국어, 독일어, 프랑스어, 스페인어를 추가했습니다
- 건너뛰기 불가 모드를 켜기 전에 확인합니다
- 작업 중 짧은 잠자기는 작업 시간에 포함되지 않습니다
- macOS에서는 메뉴 막대에만 남고 Dock에는 나타나지 않습니다

**产品功能**

1. 포모도로. 기본 작업 25분, 휴식 5분이며 자동으로 반복됩니다
2. 작업 1–120분, 휴식 1–60분으로 조절할 수 있습니다
3. 「지금 적용」으로 작업 단계부터 새 시간에 맞춰 다시 시작합니다
4. 휴식 중에는 모든 화면에 전체 화면 휴식 창이 뜹니다
5. 카운트다운은 원형 또는 플립 시계입니다
6. 언어마다 휴식 안내 30개가 무작위로 하나씩 나옵니다
7. 휴식 10초 전에 시스템 알림을 보낼 수 있습니다
8. 건너뛰기 불가 모드는 카운트다운이 끝날 때까지 모든 화면을 덮습니다
9. 8개 언어를 지원하며, 처음 실행 시 시스템 언어를 따릅니다
10. 설정은 이 컴퓨터에만 있고, 계정이나 업로드는 없습니다

**短标题**

HardBreak

**简短描述**

한동안 일한 뒤, 제대로 쉽니다. 휴식이 시작되면 모든 화면에 전체 화면 휴식 창이 뜹니다.

**关键字**

1. 포모도로
2. 강제휴식
3. 오래앉기
4. 눈휴식
5. 플립시계
6. 다중화면
7. 집중타이머

### de Deutsch

**说明**

HardBreak ist ein Pomodoro-Timer für den Desktop. Nach der Arbeitsphase legt es auf jedem Bildschirm ein Vollbild-Pausenfenster darüber, damit du wirklich aufstehst.

Voreingestellt sind 25 Minuten Arbeit und 5 Minuten Pause. Arbeit lässt sich von 1 bis 120 Minuten einstellen, Pause von 1 bis 60. Neue Zeiten gelten ab der nächsten Phase. Mit „Sofort anwenden“ startet die Zeit sofort neu, ab der Arbeitsphase.

Der Countdown ist ein Ring oder eine Fallblattuhr. Der Wechsel gilt sofort. Jede Pause zeigt zufällig einen Gesundheitstipp, 30 Stück pro Sprache.

Eine optionale Systemmitteilung erscheint 10 Sekunden vor der Pause, damit du vorher speichern kannst. Die Pflichtpause deckt alle Bildschirme ab, bis der Countdown abgelaufen ist. Vor dem Einschalten kommt eine Rückfrage.

Die Oberfläche gibt es auf Vereinfachtem Chinesisch, Traditionellem Chinesisch, Englisch, Japanisch, Koreanisch, Deutsch, Französisch und Spanisch. Beim ersten Start folgt sie der Systemsprache, sonst Englisch.

Die Einstellungen bleiben auf diesem Computer. Es gibt kein Konto und keinen Upload. Unter macOS sitzt HardBreak nur in der Menüleiste, nicht im Dock.

**此版本新增功能**

- Countdown als Fallblattuhr, der Ring bleibt verfügbar
- „Sofort anwenden“ startet nach einer Zeitänderung neu ab der Arbeitsphase
- Pausentipps von 10 auf 30 pro Sprache erhöht
- Japanisch, Koreanisch, Deutsch, Französisch und Spanisch ergänzt
- Rückfrage, bevor die Pflichtpause eingeschaltet wird
- Kurzer Ruhezustand während der Arbeit zählt nicht als Arbeitszeit
- Unter macOS nur noch in der Menüleiste, nicht mehr im Dock

**产品功能**

1. Pomodoro-Rhythmus, voreingestellt 25 Minuten Arbeit und 5 Minuten Pause
2. Arbeit von 1 bis 120 Minuten, Pause von 1 bis 60
3. „Sofort anwenden“ startet ab der Arbeitsphase neu
4. Vollbild-Pausenfenster auf jedem Bildschirm
5. Countdown als Ring oder Fallblattuhr
6. 30 Pausentipps pro Sprache, zufällig einer davon
7. Optionale Systemmitteilung 10 Sekunden vor der Pause
8. Pflichtpause deckt alle Bildschirme bis zum Ende des Countdowns ab
9. Acht Sprachen, beim ersten Start folgt die Systemsprache
10. Einstellungen bleiben auf diesem Computer, ohne Konto und ohne Upload

**短标题**

HardBreak

**简短描述**

Erst arbeiten, dann wirklich Pause. Auf jedem Bildschirm liegt ein Vollbild-Pausenfenster.

**关键字**

1. Pomodoro
2. Pflichtpause
3. langes Sitzen
4. Augenpause
5. Fallblattuhr
6. mehrere Bildschirme
7. Fokus

### fr Français

**说明**

HardBreak est un minuteur Pomodoro pour le bureau. À la fin du travail, il affiche une fenêtre de pause en plein écran sur chaque moniteur, pour que vous quittiez vraiment votre poste.

Le rythme par défaut est de 25 minutes de travail et 5 minutes de pause. Le travail se règle de 1 à 120 minutes, la pause de 1 à 60. Les nouvelles durées s'appliquent à la phase suivante. « Appliquer maintenant » relance tout de suite le minuteur depuis la phase de travail.

Le compte à rebours peut être un anneau ou une horloge à volets. Le choix agit immédiatement. Chaque pause affiche un conseil santé au hasard, 30 par langue.

Une notification système facultative apparaît 10 secondes avant la pause, le temps d'enregistrer votre travail. La pause obligatoire couvre tous les écrans jusqu'à la fin du compte à rebours. HardBreak demande une confirmation avant de l'activer.

L'interface existe en chinois simplifié, chinois traditionnel, anglais, japonais, coréen, allemand, français et espagnol. Au premier lancement, elle suit la langue du système, sinon l'anglais.

Les réglages restent sur cet ordinateur. Il n'y a pas de compte et rien n'est envoyé. Sur macOS, HardBreak reste dans la barre des menus et n'entre pas dans le Dock.

**此版本新增功能**

- Compte à rebours en horloge à volets, l'anneau reste disponible
- « Appliquer maintenant » relance le minuteur depuis la phase de travail
- Conseils de pause portés de 10 à 30 par langue
- Japonais, coréen, allemand, français et espagnol ajoutés
- Confirmation avant d'activer la pause obligatoire
- Une courte veille pendant le travail n'est plus comptée comme du travail
- Sur macOS, l'app reste dans la barre des menus et n'apparaît plus dans le Dock

**产品功能**

1. Cycle Pomodoro, 25 minutes de travail et 5 minutes de pause par défaut
2. Travail de 1 à 120 minutes, pause de 1 à 60
3. « Appliquer maintenant » relance le minuteur depuis la phase de travail
4. Fenêtre de pause en plein écran sur chaque moniteur
5. Compte à rebours en anneau ou en horloge à volets
6. 30 conseils par langue, un au hasard à chaque pause
7. Notification système facultative 10 secondes avant la pause
8. La pause obligatoire couvre tous les écrans jusqu'à la fin du compte à rebours
9. Huit langues, la première ouverture suit la langue du système
10. Les réglages restent sur cet ordinateur, sans compte ni envoi de données

**短标题**

HardBreak

**简短描述**

Travaillez un moment, puis reposez-vous vraiment. Une pause plein écran s'affiche sur chacun de vos écrans.

**关键字**

1. Pomodoro
2. pause obligatoire
3. posture assise
4. repos des yeux
5. horloge à volets
6. plusieurs écrans
7. concentration

### es Español

**说明**

HardBreak es un temporizador Pomodoro para el escritorio. Al terminar el trabajo, pone una ventana de descanso a pantalla completa en cada monitor para que te levantes de verdad.

El ritmo inicial es 25 minutos de trabajo y 5 de descanso. El trabajo se ajusta de 1 a 120 minutos, y el descanso de 1 a 60. Las nuevas duraciones se aplican en la fase siguiente. «Aplicar ahora» reinicia el temporizador al momento, desde la fase de trabajo.

La cuenta atrás puede ser un anillo o un reloj de paletas. El cambio se aplica al instante. Cada descanso muestra un consejo de salud al azar, 30 por idioma.

Un aviso opcional del sistema aparece 10 segundos antes del descanso, para que guardes el trabajo. El descanso obligatorio cubre todas las pantallas hasta que termina la cuenta atrás. HardBreak pide confirmación antes de activarlo.

La interfaz está en chino simplificado, chino tradicional, inglés, japonés, coreano, alemán, francés y español. En el primer arranque sigue el idioma del sistema y, si no está disponible, usa el inglés.

Los ajustes se quedan en este ordenador. No hay cuenta ni se envían datos. En macOS, HardBreak solo está en la barra de menús y no entra en el Dock.

**此版本新增功能**

- Cuenta atrás con reloj de paletas; el anillo sigue disponible
- «Aplicar ahora» reinicia el temporizador desde la fase de trabajo
- Los consejos de descanso pasan de 10 a 30 por idioma
- Se añaden japonés, coreano, alemán, francés y español
- Confirmación antes de activar el descanso obligatorio
- Un sueño breve durante el trabajo ya no cuenta como tiempo de trabajo
- En macOS la app queda en la barra de menús y ya no aparece en el Dock

**产品功能**

1. Ciclo Pomodoro, 25 minutos de trabajo y 5 de descanso de forma predeterminada
2. Trabajo de 1 a 120 minutos, descanso de 1 a 60
3. «Aplicar ahora» reinicia desde la fase de trabajo
4. Ventana de descanso a pantalla completa en cada monitor
5. Cuenta atrás en anillo o reloj de paletas
6. 30 consejos por idioma, uno al azar en cada descanso
7. Aviso opcional del sistema 10 segundos antes del descanso
8. El descanso obligatorio cubre todas las pantallas hasta que termina la cuenta atrás
9. Ocho idiomas; el primer arranque sigue el idioma del sistema
10. Los ajustes se quedan en este ordenador, sin cuenta ni envío de datos

**短标题**

HardBreak

**简短描述**

Trabaja un rato y descansa de verdad. En cada monitor aparece una ventana de descanso a pantalla completa.

**关键字**

1. Pomodoro
2. descanso obligatorio
3. sedentario
4. vista
5. reloj de paletas
6. varios monitores
7. concentración
