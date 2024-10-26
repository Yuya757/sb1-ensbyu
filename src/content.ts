interface HarassmentAnalysis {
  score: number;
  reason: string;
}

class HarassmentDetector {
  private static readonly HARASSMENT_PATTERNS = [
    { pattern: /\b(idiot|stupid|dumb)\b/gi, weight: 3 },
    { pattern: /\b(hate|kill|die)\b/gi, weight: 4 },
    { pattern: /\b(racist|sexist|discriminatory)\b/gi, weight: 5 },
    { pattern: /\b(harassment|bully|threaten)\b/gi, weight: 4 },
    { pattern: /\b(shut up|fuck|shit)\b/gi, weight: 4 }
  ];

  static analyzeText(text: string): HarassmentAnalysis {
    let maxScore = 0;
    let reasons: string[] = [];

    for (const { pattern, weight } of this.HARASSMENT_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        maxScore = Math.max(maxScore, weight);
        reasons.push(`Contains potentially harmful word(s): ${matches.join(', ')}`);
      }
    }

    return {
      score: maxScore,
      reason: reasons.join('. ')
    };
  }
}

class SlackMessageObserver {
  private static instance: SlackMessageObserver;
  private observer: MutationObserver;

  private constructor() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
  }

  static getInstance(): SlackMessageObserver {
    if (!SlackMessageObserver.instance) {
      SlackMessageObserver.instance = new SlackMessageObserver();
    }
    return SlackMessageObserver.instance;
  }

  start() {
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private handleMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      const messageInputs = document.querySelectorAll('[data-qa="message_input"]');
      messageInputs.forEach(input => this.attachInputListener(input as HTMLElement));
    }
  }

  private attachInputListener(input: HTMLElement) {
    if (input.dataset.harassmentDetectorAttached) return;
    
    input.dataset.harassmentDetectorAttached = 'true';
    input.addEventListener('input', this.handleInput.bind(this));
  }

  private handleInput(event: Event) {
    const input = event.target as HTMLElement;
    const text = input.textContent || '';
    const analysis = HarassmentDetector.analyzeText(text);

    this.updateUI(input, analysis);
  }

  private updateUI(input: HTMLElement, analysis: HarassmentAnalysis) {
    // Remove existing warning
    const existingWarning = input.parentElement?.querySelector('.harassment-warning');
    existingWarning?.remove();

    if (analysis.score >= 4) {
      const warning = document.createElement('div');
      warning.className = 'harassment-warning';
      warning.style.cssText = `
        position: absolute;
        bottom: -20px;
        left: 0;
        right: 0;
        color: #ff4444;
        font-size: 12px;
        padding: 4px;
        background: rgba(255, 0, 0, 0.1);
        border-radius: 4px;
      `;
      warning.textContent = `⚠️ Warning: Potential harassment level ${analysis.score}/5. ${analysis.reason}`;
      
      input.style.borderBottom = '2px solid #ff4444';
      input.parentElement?.appendChild(warning);
    } else {
      input.style.borderBottom = '';
    }
  }
}

// Start observing when content script loads
SlackMessageObserver.getInstance().start();