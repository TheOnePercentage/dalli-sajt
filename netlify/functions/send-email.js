import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'crypto';

// Read templates from the templates directory
const TEMPLATES_DIR = path.resolve('./src/templates');

function loadTemplate(filename) {
    const filePath = path.join(TEMPLATES_DIR, filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Template not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}

// Template mapping with required variables for validation
const TEMPLATE_MAP = {
    'order-confirmation': {
        file: 'order-confirmation.html',
        required: ['ordernumber', 'orderdate', 'paymentmethod', 'items', 'totalamount']
    },
    'order-shipped': {
        file: 'order-shipped.html',
        required: ['ordernumber', 'trackingnumber', 'carrier', 'shipstatus', 'estimateddelivery']
    },
    'order-delivered': {
        file: 'order-delivered.html',
        required: ['ordernumber', 'deliverydate', 'itemsummary']
    },
    'refund-approved': {
        file: 'refund-approved.html',
        required: ['ordernumber', 'refundamount', 'refunddate', 'refundmethod', 'refundtimeline']
    },
    'password-reset': {
        file: 'password-reset.html',
        required: ['reseturl', 'resettime', 'loginurl']
    }
};

/**
 * Render email template with data and variable replacement
 * @param {string} templateName - Name of the template (order-confirmation, etc.)
 * @param {object} data - Template data variables
 * @returns {object} Result with html and validation status
 */
function renderEmail(templateName, data = {}) {
    const templateInfo = TEMPLATE_MAP[templateName];
    if (!templateInfo) {
        throw new Error(`Unknown template: ${templateName}`);
    }

    let html = loadTemplate(`./templates/${templateInfo.file}`);

    // Replace {{variable}} patterns with actual values
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, value !== undefined && value !== null ? String(value) : '');
    }

    // Ensure responsive meta tags are included for mobile readability
    if (!html.includes('viewport')) {
        html = html.replace(
            '</head>',
            `<meta name="viewport" content="width=device-width, initial-scale=1.0"><\/head>`
        );
    }

    // Validate required variables
    const missing = templateInfo.required.filter(key => !data[key] || data[key] === '');

    return {
        html,
        valid: missing.length === 0,
        missing,
        template: templateName
    };
}

/**
 * Email queue system for reliable sending
 */
class EmailQueue {
    constructor() {
        this.queuePath = path.resolve('./.email-queue.json');
        this.loadQueue();
    }

    loadQueue() {
        try {
            if (fs.existsSync(this.queuePath)) {
                this.queue = JSON.parse(fs.readFileSync(this.queuePath, 'utf-8'));
            } else {
                this.queue = [];
            }
        } catch (e) {
            this.queue = [];
        }
    }

    saveQueue() {
        try {
            fs.writeFileSync(this.queuePath, JSON.stringify(this.queue, null, 2));
        } catch (e) {
            console.error('Failed to save email queue:', e);
        }
    }

    add(template, to, subject, data, retryCount = 0) {
        const id = uuidv4();
        const entry = {
            id,
            template,
            to,
            subject,
            data,
            status: retryCount > 0 ? 'retry' : 'pending',
            createdAt: new Date().toISOString(),
            retryCount,
            maxRetries: 3
        };
        this.queue.push(entry);
        this.saveQueue();
        return id;
    }

    getPending() {
        return this.queue.filter(e => e.status === 'pending' || e.status === 'retry');
    }

    complete(id, success = true) {
        const index = this.queue.findIndex(e => e.id === id);
        if (index !== -1) {
            this.queue[index].status = success ? 'sent' : 'failed';
            this.queue[index].sentAt = new Date().toISOString();
            this.saveQueue();
        }
    }

    fail(id) {
        const index = this.queue.findIndex(e => e.id === id);
        if (index !== -1) {
            this.queue[index].retryCount += 1;
            if (this.queue[index].retryCount >= this.queue[index].maxRetries) {
                this.queue[index].status = 'failed';
            } else {
                this.queue[index].status = 'retry';
            }
            this.saveQueue();
        }
    }
}

// Create global email queue instance
const emailQueue = new EmailQueue();

/**
 * Send transactional email via Netlify Functions
 * @param {object} params - Email parameters
 * @param {string} params.template - Template name (order-confirmation, etc.)
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {object} params.data - Template data variables
 * @returns {object} Send result with queue ID and status
 */
export async function sendTransactionalEmail({ template, to, subject, data }) {
    try {
        // Validate template and data
        const validation = validateTemplateData(template, data);
        if (!validation.valid) {
            console.error(`Template validation failed for ${template}: missing ${validation.missing.join(', ')}`);
            return {
                success: false,
                error: `Missing required variables: ${validation.missing.join(', ')}`,
                template
            };
        }

        // Render the email HTML
        const rendered = renderEmail(template, data);
        if (!rendered.valid) {
            return {
                success: false,
                error: `Template rendering incomplete: ${rendered.missing.join(', ')}`,
                template
            };
        }

        // Add to email queue for reliable sending
        const queueId = emailQueue.add(template, to, subject, data);
        
        // TODO: Uncomment and configure for production email service
        /*
        const transport = createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transport.sendMail({
            from: 'DALLI <no-reply@dalli.rs>',
            to,
            subject,
            html: rendered.html
        });

        emailQueue.complete(queueId, true);
        */

        // For now, mark as sent in queue (simulated)
        emailQueue.complete(queueId, true);

        return {
            success: true,
            message: 'Email queued successfully',
            queueId,
            template,
            to,
            subject,
            htmlLength: rendered.html.length
        };
    } catch (error) {
        console.error('Error sending transactional email:', error);
        
        // Try to queue for retry if we have a queue ID
        try {
            if (template && to && subject) {
                const queueId = emailQueue.add(template, to, subject, data, 1);
                emailQueue.fail(queueId);
            }
        } catch (queueError) {
            console.error('Failed to queue email for retry:', queueError);
        }

        return {
            success: false,
            error: error.message,
            template
        };
    }
}

/**
 * Validate email data against template requirements
 * @param {string} template - Template name
 * @param {object} data - Data to validate
 * @returns {object} Validation result
 */
export function validateTemplateData(template, data) {
    const requirements = {
        'order-confirmation': ['ordernumber', 'orderdate', 'paymentmethod', 'items', 'totalamount'],
        'order-shipped': ['ordernumber', 'trackingnumber', 'carrier', 'shipstatus', 'estimateddelivery'],
        'order-delivered': ['ordernumber', 'deliverydate', 'itemsummary'],
        'refund-approved': ['ordernumber', 'refundamount', 'refunddate', 'refundmethod', 'refundtimeline'],
        'password-reset': ['reseturl', 'resettime', 'loginurl']
    };

    const required = requirements[template] || [];
    const missing = required.filter(key => !data || !data[key]);

    return {
        valid: missing.length === 0,
        missing,
        template
    };
}

/**
 * Get all available templates with their requirements
 * @returns {object} Templates metadata
 */
export function getAvailableTemplates() {
    return {
        'order-confirmation': {
            file: 'order-confirmation.html',
            required: ['ordernumber', 'orderdate', 'paymentmethod', 'items', 'totalamount'],
            description: 'Potvrda uspesno poslate porudzbine'
        },
        'order-shipped': {
            file: 'order-shipped.html',
            required: ['ordernumber', 'trackingnumber', 'carrier', 'shipstatus', 'estimateddelivery'],
            description: 'Informacija o shipmentu i pratilici'
        },
        'order-delivered': {
            file: 'order-delivered.html',
            required: ['ordernumber', 'deliverydate', 'itemsummary'],
            description: 'Potvrda o isporuci porudzbine'
        },
        'refund-approved': {
            file: 'refund-approved.html',
            required: ['ordernumber', 'refundamount', 'refunddate', 'refundmethod', 'refundtimeline'],
            description: 'Odobrenje povrata novca'
        },
        'password-reset': {
            file: 'password-reset.html',
            required: ['reseturl', 'resettime', 'loginurl'],
            description: 'Reset lozinke za nalog korisnika'
        }
    };
}

/**
 * Generate plain text version from HTML email (for clients that don't render HTML)
 * @param {string} template - Template name
 * @param {object} data - Template data
 * @returns {string} Plain text email content
 */
export function generateTextVersion(template, data) {
    const html = renderEmail(template, data).html;
    
    // Simple HTML to text conversion
    return html
        .replace(/<style[^>]*>.*?<\/style>/si, '')  // Remove CSS
        .replace(/<script[^>]*>.*?<\/script>/si, '')  // Remove scripts
        .replace(/<[^>]+>/g, ' ')  // Remove tags
        .replace(/&nbsp;/g, ' ')  // Replace non-breaking spaces
        .replace(/&/g, '&')  // Replace entities
        .replace(/</g, '<')  // Replace entities
        .replace(/>/g, '>')  // Replace entities
        .trim();
}

/**
 * Health check - verify templates and queue are accessible
 * @returns {object} Health status
 */
export function healthCheck() {
    const templates = {};
    let allValid = true;
    
    for (const [name, info] of Object.entries(TEMPLATE_MAP)) {
        try {
            // Just check if template file exists
            const templatePath = path.resolve(`./templates/${info.file}`);
            const exists = fs.existsSync(templatePath);
            templates[name] = { 
                exists, 
                required: info.required,
                valid: true 
            };
            if (!exists) allValid = false;
        } catch (e) {
            templates[name] = { 
                exists: false, 
                required: info.required,
                valid: false,
                error: e.message 
            };
            allValid = false;
        }
    }
    
    return {
        healthy: allValid,
        templates,
        queueSize: emailQueue.getPending().length
    };
}
