import { isMagnetLink } from "./utils";

export class StyleManager {
  private static readonly STYLES = `
      .rt-read {
        display: inline !important;
        padding: 2px 8px 2px 16px !important;
        margin: 2px 0 !important;
        border-radius: 4px !important;
        background-color: var(--rt-bg-color, rgba(0, 0, 0, 0.08)) !important;
        color: var(--rt-font-color) !important; 
        box-decoration-break: clone !important;
        -webkit-box-decoration-break: clone !important;
        vertical-align: text-top !important;
        text-decoration: none !important;
        line-height: 1.2 !important;
        position: relative !important;
        opacity: 0.85 !important;
      }
  
      .rt-read:not(.rt-magnet)::before {
        content: "" !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        width: 8px !important;
        background: var(--rt-accent-color) !important;
        border-top-left-radius: 4px !important;
        border-bottom-left-radius: 4px !important;
        opacity: 0.8 !important;
      }
  
      .rt-magnet {
        padding: 2px 8px !important;
      }
  
      .rt-read:hover {
        opacity: 1 !important;
        transition: all 0.2s ease !important;
      }
  
      .rt-read:hover:not(.rt-magnet)::before {
        opacity: 1 !important;
        transition: opacity 0.2s ease !important;
      }
  
      .rt-read[style*="display: block"],
      .rt-read[style*="display:block"] {
        display: inline !important;
      }
    `;

  private styleElement: HTMLStyleElement | null = null;

  public initialize(): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement("style");
      this.styleElement.textContent = StyleManager.STYLES;
      document.head.appendChild(this.styleElement);
    }
  }

  public cleanup(): void {
    if (this.styleElement && document.head.contains(this.styleElement)) {
      document.head.removeChild(this.styleElement);
      this.styleElement = null;
    }
  }

  private getBgColor(element: HTMLElement): string {
    const backgroundColor = window.getComputedStyle(element).backgroundColor;
    if (
      backgroundColor === "rgba(0, 0, 0, 0)" ||
      backgroundColor === "transparent"
    ) {
      return element.parentElement
        ? this.getBgColor(element.parentElement)
        : window.getComputedStyle(document.body).backgroundColor;
    }
    return backgroundColor;
  }

  private getLuminance(color: string): number {
    const rgb = color.match(/\d+/g)?.map(Number) || [255, 255, 255];
    const [r, g, b] = rgb.map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private getThemeColors(element: HTMLElement) {
    const bgColor = this.getBgColor(element);
    const luminance = this.getLuminance(bgColor);
    const isDark = luminance <= 0.5;

    if (isDark) {
      return {
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        accentColor: "rgba(128, 128, 128, 0.85)", // Gray
        fontColor: "rgba(255, 255, 255, 0.2)", // Lightened font color
        fontWeight: "normal", // Normal font weight
      };
    } else {
      return {
        backgroundColor: "rgba(0, 0, 0, 0.06)",
        accentColor: "rgba(128, 128, 128, 0.85)", // Gray
        fontColor: "rgba(0, 0, 0, 0.2)", // Lightened font color
        fontWeight: "normal", // Normal font weight
      };
    }
  }

  public markLink(link: HTMLAnchorElement): void {
    const computedStyle = window.getComputedStyle(link);
    if (computedStyle.display === "block") {
      link.style.display = "inline-block";
    }

    const colors = this.getThemeColors(link);
    link.style.setProperty("--rt-bg-color", colors.backgroundColor);
    link.style.setProperty("--rt-accent-color", colors.accentColor);
    link.style.setProperty("--rt-font-color", colors.fontColor);
    link.style.setProperty("--rt-font-weight", colors.fontWeight);

    link.classList.add("rt-read");

    // Use isMagnetLink function to determine
    if (isMagnetLink(link)) {
      link.classList.add("rt-magnet");
    }
  }
}
