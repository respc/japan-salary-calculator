class JapanSalaryCalculator {
    constructor() {
        this.RATES = {
            EMPLOYMENT_INSURANCE: 0.006,
            PENSION_INSURANCE: 0.183,
            HEALTH_INSURANCE_TOKYO: 0.0998,  // 東京都協会けんぽ（労使合計）
            CARE_INSURANCE: 0.0182,
            RECONSTRUCTION_SURTAX: 1.021,
        };
        this.CAPS = {
            HEALTH_INSURANCE_SMR: 650000,  // 月額上限65万円
            PENSION_INSURANCE_SMR: 650000,  // 月額上限65万円
            HEALTH_INSURANCE_SBA_YEARLY: 5730000,
            PENSION_INSURANCE_SBA_PER_PAYMENT: 1500000,
        };
        this.prefectureData = this.initializePrefectureData();
        this.initializeEventListeners();
        this.setupNumberFormatting();
    }

    initializePrefectureData() {
        return {
            tokyo: { name: '東京都', flatRate: 5000 },
            osaka: { name: '大阪府', flatRate: 5300 },
            kanagawa: { name: '神奈川県', flatRate: 5300 },
            other: { name: 'その他', flatRate: 5000 }
        };
    }

    setupNumberFormatting() {
        const numberInputs = ['grossSalary', 'lastYearSalary', 'bonus', 'companyHousing', 'medicalExpenses', 'lifeInsurance', 'donation'];
        numberInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^\d.]/g, '');
                });
            }
        });
    }

    parseManEnNumber(value) {
        if (!value) return 0;
        const cleanValue = String(value).replace(/[^\d.]/g, '');
        return parseFloat(cleanValue) * 10000 || 0;
    }

    initializeEventListeners() {
        document.getElementById('salaryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateSalary();
        });
    }

    calculateSalary() {
        const originalGrossSalary = this.parseManEnNumber(document.getElementById('grossSalary').value);
        const lastYearSalary = this.parseManEnNumber(document.getElementById('lastYearSalary').value);
        const age = parseInt(document.getElementById('age').value, 10);
        const prefectureKey = document.getElementById('prefecture').value;
        const bonus = this.parseManEnNumber(document.getElementById('bonus').value);
        const companyHousingMonthly = this.parseManEnNumber(document.getElementById('companyHousing').value);

        if (!originalGrossSalary || !age) {
            alert('年収と年齢を入力してください');
            return;
        }

        const companyHousingYearly = companyHousingMonthly * 12;
        const taxableGrossSalary = originalGrossSalary - companyHousingYearly;

        if (taxableGrossSalary < 0) {
            alert('社宅費が年収を超えています。');
            return;
        }
        
        const monthlySalaryTotal = taxableGrossSalary - bonus;
        if (monthlySalaryTotal < 0) {
            alert('賞与額が年収（社宅費控除後）を超えています。');
            return;
        }
        const monthlySalary = monthlySalaryTotal / 12;

        const advancedOptions = {
            hasSpouse: document.getElementById('hasSpouse').value === 'yes',
            dependents: parseInt(document.getElementById('dependents').value, 10) || 0,
            disabledDependents: parseInt(document.getElementById('disabledDependents').value, 10) || 0,
            medicalExpenses: this.parseManEnNumber(document.getElementById('medicalExpenses').value),
            lifeInsurance: this.parseManEnNumber(document.getElementById('lifeInsurance').value),
            donation: this.parseManEnNumber(document.getElementById('donation').value),
        };

        const calculations = this.performCalculations({
            taxableGrossSalary,
            monthlySalary,
            bonus,
            lastYearSalary: lastYearSalary || taxableGrossSalary,
            age,
            prefectureKey,
            ...advancedOptions
        });

        const displayData = { ...calculations, originalGrossSalary, companyHousingDeduction: companyHousingYearly, bonus };
        
        this.displayResults(displayData);
    }

    performCalculations(params) {
        const socialInsurance = this.calculateSocialInsurance(params.monthlySalary, params.bonus, params.age);
        const salaryDeduction = this.calculateSalaryDeduction(params.taxableGrossSalary);
        const basicDeduction = 480000;
        const spouseDeduction = params.hasSpouse ? 380000 : 0;
        const dependentDeduction = params.dependents * 380000;
        const disabledDependentDeduction = params.disabledDependents * 270000;
        const lifeInsuranceDeduction = Math.min(params.lifeInsurance, 120000);
        const medicalDeduction = Math.max(0, params.medicalExpenses - 100000);
        const otherDeductionsTotal = medicalDeduction + lifeInsuranceDeduction + params.donation;

        const totalDeductionsForIncomeTax = socialInsurance.total + salaryDeduction + basicDeduction + spouseDeduction + dependentDeduction + disabledDependentDeduction + otherDeductionsTotal;
        const taxableForIncomeTax = Math.max(0, params.taxableGrossSalary - totalDeductionsForIncomeTax);
        const incomeTax = this.calculateIncomeTax(taxableForIncomeTax);

        const lastYearSocialInsurance = this.calculateSocialInsurance(params.lastYearSalary / 12, 0, params.age).total;
        const lastYearSalaryDeduction = this.calculateSalaryDeduction(params.lastYearSalary);
        const totalDeductionsForResidentTax = lastYearSocialInsurance + lastYearSalaryDeduction + 430000 + (params.hasSpouse ? 330000 : 0) + (params.dependents * 330000) + disabledDependentDeduction + otherDeductionsTotal;
        const taxableForResidentTax = Math.max(0, params.lastYearSalary - totalDeductionsForResidentTax);
        const residentTax = this.calculateResidentTax(taxableForResidentTax, params.prefectureKey);

        const netSalary = params.taxableGrossSalary - (socialInsurance.total + incomeTax + residentTax);
        
        const nextYearResidentTaxableIncome = Math.max(0, params.taxableGrossSalary - (socialInsurance.total + salaryDeduction + 430000 + (params.hasSpouse ? 330000 : 0) + (params.dependents * 330000) + disabledDependentDeduction + otherDeductionsTotal));
        const nextYearResidentTax = this.calculateResidentTax(nextYearResidentTaxableIncome, params.prefectureKey);
        
        const furusatoLimit = this.calculateFurusatoLimit(taxableForIncomeTax, nextYearResidentTax - this.prefectureData[params.prefectureKey].flatRate);

        return { netSalary, incomeTax, residentTax, socialInsurance, nextYearResidentTax, furusatoLimit };
    }

    calculateSocialInsurance(monthlySalary, bonus, age) {
        const smrHealth = Math.min(monthlySalary, this.CAPS.HEALTH_INSURANCE_SMR);
        const smrPension = Math.min(monthlySalary, this.CAPS.PENSION_INSURANCE_SMR);
        const sba = Math.floor(bonus / 1000) * 1000;

        const healthRate = this.RATES.HEALTH_INSURANCE_TOKYO + (age >= 40 ? this.RATES.CARE_INSURANCE : 0);
        const careRate = age >= 40 ? this.RATES.CARE_INSURANCE / 2 : 0;

        const healthIns = (smrHealth * 12 + Math.min(sba, this.CAPS.HEALTH_INSURANCE_SBA_YEARLY)) * healthRate / 2;
        const careIns = (smrHealth * 12 + Math.min(sba, this.CAPS.HEALTH_INSURANCE_SBA_YEARLY)) * careRate;
        const pensionIns = (smrPension * 12 + Math.min(sba, this.CAPS.PENSION_INSURANCE_SBA_PER_PAYMENT)) * this.RATES.PENSION_INSURANCE / 2;
        const employmentIns = (monthlySalary * 12 + bonus) * this.RATES.EMPLOYMENT_INSURANCE;

        const result = { health: Math.round(healthIns), pension: Math.round(pensionIns), employment: Math.round(employmentIns), care: Math.round(careIns) };
        result.total = result.health + result.pension + result.employment;
        return result;
    }

    calculateSalaryDeduction(grossSalary) {
        if (grossSalary <= 1625000) return 550000;
        if (grossSalary <= 1800000) return grossSalary * 0.4 - 100000;
        if (grossSalary <= 3600000) return grossSalary * 0.3 + 80000;
        if (grossSalary <= 6600000) return grossSalary * 0.2 + 440000;
        if (grossSalary <= 8500000) return grossSalary * 0.1 + 1100000;
        return 1950000;
    }

    calculateIncomeTax(taxableIncome) {
        let tax;
        if (taxableIncome <= 1950000) tax = taxableIncome * 0.05;
        else if (taxableIncome <= 3300000) tax = taxableIncome * 0.10 - 97500;
        else if (taxableIncome <= 6950000) tax = taxableIncome * 0.20 - 427500;
        else if (taxableIncome <= 9000000) tax = taxableIncome * 0.23 - 636000;
        else if (taxableIncome <= 18000000) tax = taxableIncome * 0.33 - 1536000;
        else if (taxableIncome <= 40000000) tax = taxableIncome * 0.40 - 2796000;
        else tax = taxableIncome * 0.45 - 4796000;
        return Math.round(tax * this.RATES.RECONSTRUCTION_SURTAX);
    }

    calculateResidentTax(taxableIncome, prefectureKey) {
        const prefData = this.prefectureData[prefectureKey];
        return Math.round(taxableIncome * 0.10 + prefData.flatRate);
    }

    calculateFurusatoLimit(taxableForIncomeTax, residentTaxIncomePortion) {
        if (residentTaxIncomePortion <= 0) return 0;
        let incomeTaxRate = 0;
        if (taxableForIncomeTax <= 1950000) incomeTaxRate = 0.05;
        else if (taxableForIncomeTax <= 3300000) incomeTaxRate = 0.10;
        else if (taxableForIncomeTax <= 6950000) incomeTaxRate = 0.20;
        else if (taxableForIncomeTax <= 9000000) incomeTaxRate = 0.23;
        else if (taxableForIncomeTax <= 18000000) incomeTaxRate = 0.33;
        else if (taxableForIncomeTax <= 40000000) incomeTaxRate = 0.40;
        else incomeTaxRate = 0.45;

        const denominator = 0.90 - (incomeTaxRate * this.RATES.RECONSTRUCTION_SURTAX);
        if (denominator <= 0) return 2000;
        const limit = (residentTaxIncomePortion * 0.20) / denominator + 2000;
        return Math.floor(limit / 1000) * 1000;
    }

    displayResults(data) {
        const totalDeductionsDisplay = data.socialInsurance.total + data.incomeTax + data.residentTax + data.companyHousingDeduction;

        document.getElementById('netSalary').textContent = this.formatCurrency(data.netSalary);
        document.getElementById('monthlyNet').textContent = this.formatCurrency(data.netSalary / 12);
        document.getElementById('grossAmount').textContent = this.formatCurrency(data.originalGrossSalary);
        document.getElementById('totalDeductions').textContent = this.formatCurrency(totalDeductionsDisplay);
        document.getElementById('incomeTax').textContent = this.formatCurrency(data.incomeTax);
        document.getElementById('residentTax').textContent = this.formatCurrency(data.residentTax);
        document.getElementById('healthInsurance').textContent = this.formatCurrency(data.socialInsurance.health);
        document.getElementById('pensionInsurance').textContent = this.formatCurrency(data.socialInsurance.pension);
        document.getElementById('employmentInsurance').textContent = this.formatCurrency(data.socialInsurance.employment);

        const careRow = document.getElementById('careInsuranceRow');
        if (data.socialInsurance.care > 0) {
            document.getElementById('careInsurance').textContent = this.formatCurrency(data.socialInsurance.care);
            careRow.style.display = 'flex';
        } else {
            careRow.style.display = 'none';
        }
        
        // Bonus calculation approximation
        const bonusSocialInsurance = this.calculateSocialInsurance(0, data.bonus, parseInt(document.getElementById('age').value, 10)).total;
        const bonusNet = data.bonus > 0 ? data.bonus - bonusSocialInsurance - (data.incomeTax * (data.bonus / (data.originalGrossSalary - data.companyHousingDeduction))) : 0;

        document.getElementById('monthlyBase').textContent = this.formatCurrency((data.netSalary - bonusNet) / 12);
        document.getElementById('bonusNet').textContent = this.formatCurrency(bonusNet);
        
        document.getElementById('nextYearResidentTax').textContent = this.formatCurrency(data.nextYearResidentTax);
        document.getElementById('furusatoLimit').textContent = this.formatCurrency(data.furusatoLimit);

        // ふるさと納税のアドバイス更新
        document.getElementById('furusatoTip').textContent = 
            `上限額 ${this.formatCurrency(data.furusatoLimit)} まで寄附することで実質2,000円で返礼品を受け取れます。`;

        // 各種節税額計算
        this.calculateTaxSavings(data);

        // 社宅控除の表示
        if (data.companyHousingDeduction > 0) {
            const existingHousing = document.getElementById('companyHousingBreakdown');
            if (!existingHousing) {
                const housingItem = document.createElement('div');
                housingItem.className = 'breakdown-item';
                housingItem.id = 'companyHousingBreakdown';
                housingItem.innerHTML = `
                    <span class="breakdown-label">借り上げ社宅控除</span>
                    <span class="breakdown-value">${this.formatCurrency(data.companyHousingDeduction)}</span>
                `;
                document.querySelector('.breakdown-grid').appendChild(housingItem);
            } else {
                existingHousing.querySelector('.breakdown-value').textContent = this.formatCurrency(data.companyHousingDeduction);
            }
        }

        // 賞与がない場合は非表示
        const bonusBreakdown = document.getElementById('bonusBreakdown');
        if (data.bonus > 0) {
            bonusBreakdown.style.display = 'block';
        } else {
            bonusBreakdown.style.display = 'none';
        }

        document.getElementById('results').classList.remove('hidden');
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }

    calculateTaxSavings(data) {
        // 現在の課税所得から所得税率を計算
        const age = parseInt(document.getElementById('age').value, 10);
        const grossSalary = data.originalGrossSalary - data.companyHousingDeduction;
        
        // 簡易的に課税所得を再計算（実際の計算と同じロジック）
        const salaryDeduction = this.calculateSalaryDeduction(grossSalary);
        const socialInsurance = this.calculateSocialInsurance(grossSalary / 12, data.bonus, age);
        const basicDeduction = 480000;
        const totalDeductions = socialInsurance.total + salaryDeduction + basicDeduction;
        const taxableIncome = Math.max(0, grossSalary - totalDeductions);
        
        // 所得税率を計算
        let incomeTaxRate = 0.05;
        if (taxableIncome > 1950000) incomeTaxRate = 0.10;
        if (taxableIncome > 3300000) incomeTaxRate = 0.20;
        if (taxableIncome > 6950000) incomeTaxRate = 0.23;
        if (taxableIncome > 9000000) incomeTaxRate = 0.33;
        if (taxableIncome > 18000000) incomeTaxRate = 0.40;
        if (taxableIncome > 40000000) incomeTaxRate = 0.45;
        
        // 復興特別所得税を含む
        incomeTaxRate = incomeTaxRate * this.RATES.RECONSTRUCTION_SURTAX;
        
        // 住民税率（10%固定）
        const residentTaxRate = 0.10;
        const totalTaxRate = incomeTaxRate + residentTaxRate;

        // 1. ふるさと納税の実質節税額
        const furusatoSavings = Math.max(0, data.furusatoLimit - 2000);
        document.getElementById('furusatoSavingsAmount').textContent = this.formatCurrency(furusatoSavings);

        // 2. iDeCoの節税額（年間最大拠出額：276,000円）
        const idecoMaxContribution = 276000; // 23,000円 × 12ヶ月
        const idecoSavings = idecoMaxContribution * totalTaxRate;
        document.getElementById('idecoSavingsAmount').textContent = this.formatCurrency(idecoSavings);

        // 3. つみたてNISAの節税額（年間40万円投資、5%利回りの利益に対する節税）
        const nisaMaxInvestment = 400000;
        const expectedReturn = 0.05;
        const nisaProfit = nisaMaxInvestment * expectedReturn;
        const nisaSavings = nisaProfit * totalTaxRate;
        document.getElementById('nisaSavingsAmount').textContent = this.formatCurrency(nisaSavings);

        // 4. 生命保険料控除の節税額（最大控除額：120,000円）
        const maxInsuranceDeduction = 120000;
        const insuranceSavings = maxInsuranceDeduction * totalTaxRate;
        document.getElementById('insuranceSavingsAmount').textContent = this.formatCurrency(insuranceSavings);
    }

    formatCurrency(amount) {
        return '¥' + Math.round(amount).toLocaleString('ja-JP');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new JapanSalaryCalculator();
});