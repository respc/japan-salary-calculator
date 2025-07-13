# 日本年収計算機 - Japan Salary Calculator

AI-driven Japanese salary calculator with personalized tax strategy recommendations.

## Features

### Core Calculation Features
- **Accurate Tax Calculations**: Income tax, resident tax, social insurance
- **Regional Accuracy**: 9+ prefecture-specific tax rates and health insurance rates
- **Employment Type Support**: Regular employees, contract workers, part-time, self-employed, freelancers
- **Side Income Integration**: Comprehensive side business income and expense calculations
- **Company Housing Benefits**: Proper calculation of company housing deductions

### Advanced Features
- **AI-Powered Tax Strategy Recommendations**: Personalized advice based on user profile
- **Tax Strategy Comparison Tool**: Compare multiple tax-saving strategies side-by-side
- **Calculation Process Transparency**: Step-by-step breakdown of how taxes are calculated
- **Interactive UI**: Auto-calculation, responsive design, error handling

### Technical Features
- **Mobile-First Design**: Fully responsive across all devices
- **Performance Optimized**: Debounced inputs, efficient DOM manipulation
- **Accessibility**: WCAG compliant, keyboard navigation, screen reader support
- **SEO Optimized**: Meta tags, structured data, social media sharing

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Variables
- **No Dependencies**: Pure vanilla JavaScript implementation
- **Standards Compliant**: Modern web standards, semantic HTML

## Project Structure

```
japan-salary-calculator/
├── index.html          # Main HTML file
├── style.css           # Stylesheet with responsive design
├── script.js           # Core calculation logic and UI
└── README.md           # Project documentation
```

## Deployment

### Static Hosting
This project can be deployed to any static hosting service:

- **GitHub Pages**: Push to GitHub and enable Pages
- **Vercel**: Connect repository and deploy
- **Netlify**: Drag and drop or connect repository
- **AWS S3 + CloudFront**: Upload files to S3 bucket

### Local Development
1. Clone the repository
2. Open `index.html` in a web browser
3. Or serve with a local server: `python -m http.server 8000`

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Tax Calculation Accuracy

The calculator uses 2024 Japanese tax rates and regulations:
- Income tax brackets with reconstruction surtax (2.1%)
- Regional resident tax rates (prefecture + city)
- Social insurance rates by prefecture
- Employment insurance rates by job type

## Contributing

This project follows Japanese tax law and regional variations. When contributing:

1. Verify calculations against official sources
2. Test across different user scenarios
3. Maintain responsive design
4. Follow existing code style

## License

This project is for educational and personal use. Tax calculations are estimates and should not replace professional tax advice.

## Disclaimer

This calculator provides estimates based on 2024 tax rates. Actual tax amounts may vary based on individual circumstances. For official tax advice, consult a qualified tax professional or the Japan Tax Agency.