<?php
namespace Database\Seeders\Presentation;
use App\Models\{Course, User};
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Validator;

class PresentationData
{
    public const USERS = [
        ['Marisol', 'Reyes', 'marisol.reyes', 'admin'],
        ['Adrian', 'Mendoza', 'adrian.mendoza', 'instructor'],
        ['Lara', 'Villanueva', 'lara.villanueva', 'instructor'],
        ['Isabella', 'Santos', 'isabella.santos', 'student'],
        ['Gabriel', 'Reyes', 'gabriel.reyes', 'student'],
        ['Beatrice', 'Flores', 'beatrice.flores', 'student'],
        ['Miguel', 'Navarro', 'miguel.navarro', 'student'],
        ['Camille', 'Torres', 'camille.torres', 'student'],
        ['Daniel', 'Garcia', 'daniel.garcia', 'student'],
        ['Sofia', 'Ramos', 'sofia.ramos', 'student'],
        ['Paolo', 'Castillo', 'paolo.castillo', 'student'],
        ['Alyssa', 'Dela Cruz', 'alyssa.delacruz', 'student'],
        ['Nathan', 'Aquino', 'nathan.aquino', 'student'],
    ];
    // Correct 20-point answers in quiz 1, quiz 2, exam; then two essay scores.
    public const PROFILES = [
        [5, 5, 5, 10, 10], [5, 4, 5, 10, 9],
        [4, 4, 4, 8, 8], [3, 4, 4, 7, 8], [4, 3, 3, 7, null], [3, 4, 3, 7, 7],
        [2, 4, 4, 8, 8], [2, 5, 4, 9, 8],
        [1, null, null, null, null], [2, 2, null, null, null],
    ];
    public static function date(): CarbonImmutable
    {
        return config('presentation.date') ? CarbonImmutable::parse(config('presentation.date'))->startOfDay() : CarbonImmutable::now()->startOfDay();
    }
    public static function assertSafe(): void
    {
        if (!app()->environment(['local', 'testing'])) throw new \RuntimeException('Presentation seeding requires a local/testing environment.');
        Validator::make(['password' => config('presentation.password')], [
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/'],
        ])->validate();
        $emails = array_map(fn ($u) => $u[2] . '@intellilearn.edu', self::USERS);
        if (User::whereNotIn('email', $emails)->exists() || Course::whereNotIn('code', array_keys(self::courses()))->exists()) {
            throw new \RuntimeException('Use a dedicated empty presentation database; seeders do not delete unrelated records.');
        }
    }
    public static function courses(): array
    {
        return [
            'IT 321' => ['title' => 'Web Systems and Technologies', 'teacher' => 'adrian.mendoza', 'join' => 'WEB321',
                'description' => 'Design accessible interfaces and secure web applications using browser standards, HTTP, and server-side validation.',
                'lessons' => [
                    ['Semantic Structure and Accessibility', 'Semantic HTML', 'Semantic elements describe content purpose. A label connects a form control to its accessible name. Keyboard navigation and meaningful headings support accessible interaction.'],
                    ['Responsive Layout and the Box Model', 'Responsive CSS', 'The box model consists of content, padding, border, and margin. Padding separates content from its border; margin separates neighboring elements. Flexbox arranges items along an axis and media queries adapt layouts to available width.'],
                    ['HTTP Requests and Form Validation', 'HTTP and validation', 'GET retrieves resources and POST submits data. Server-side validation is required even when a browser validates inputs. A 422 response communicates invalid input, while a 401 response indicates missing authentication.'],
                    ['Secure Sessions and Accessible Forms', 'Application security', 'Use HTTPS to protect credentials in transit, server-side input validation to reject invalid data, and authorization checks to restrict access to each resource. Passwords must be hashed and never stored as plain text.'],
                ],
                'questions' => [
                    ['Which element represents the main navigation area?', ['nav', 'span', 'br', 'i'], 'nav'],
                    ['Which attribute connects a label to a form control?', ['for', 'src', 'href', 'width'], 'for'],
                    ['Which CSS property adds space between content and its border?', ['padding', 'margin', 'opacity', 'z-index'], 'padding'],
                    ['Which HTTP method retrieves a resource?', ['GET', 'POST', 'PATCH', 'DELETE'], 'GET'],
                    ['Which response status commonly indicates invalid input?', ['422', '200', '301', '204'], '422'],
                ],
                'statement' => 'Browser validation alone is sufficient to protect server data.', 'truth' => 'False',
                'short' => ['Which protocol protects credentials in transit?', 'HTTPS'],
                'pairs' => [['GET', 'Retrieve a resource'], ['POST', 'Submit data'], ['422', 'Invalid input']],
                'essay' => 'Explain three safeguards for a university web application that accepts student credentials.',
                'answer' => 'Use HTTPS to protect credentials in transit, validate inputs on the server, and enforce resource authorization. Password hashes reduce exposure if a database is compromised.',
                'partial' => 'HTTPS protects credentials while a form is submitted. Input should also be checked on the server.',
                'reflection' => 'Describe how you would make a student registration form easier to use with a keyboard, and explain how you would evaluate the improvement.',
            ],
            'IT 322' => ['title' => 'Database Management Systems', 'teacher' => 'adrian.mendoza', 'join' => 'DATA322',
                'description' => 'Model relational data, apply integrity constraints, write SQL queries, and design reliable database transactions.',
                'lessons' => [
                    ['Entities, Keys, and Relationships', 'Relational modeling', 'A primary key uniquely identifies each row. A foreign key references a related row. A many-to-many relationship uses a junction table, such as enrollment between students and courses.'],
                    ['Normalization and Integrity Constraints', 'Normalization', 'Normalization reduces redundant facts and update anomalies. A unique constraint rejects duplicate values. A foreign key prevents references to nonexistent related rows.'],
                    ['SQL Queries and Aggregation', 'SQL', 'SELECT retrieves rows, WHERE filters rows, and GROUP BY organizes rows for aggregation. COUNT counts rows and AVG computes the arithmetic mean. A join combines related rows through a matching key.'],
                    ['Transactions and Concurrent Updates', 'Transaction safety', 'Atomicity makes a transaction succeed or fail as a whole. Consistency preserves constraints. Isolation prevents concurrent operations from interfering, and durability preserves committed changes. A rollback cancels an incomplete transaction.'],
                ],
                'questions' => [
                    ['Which key uniquely identifies a row?', ['Primary key', 'Foreign key', 'Display name', 'Row position'], 'Primary key'],
                    ['Which table models students taking several courses?', ['Enrollment junction table', 'Single text column', 'Duplicated course table', 'Unrelated archive'], 'Enrollment junction table'],
                    ['Which constraint rejects duplicate values?', ['UNIQUE', 'DEFAULT', 'ORDER BY', 'LIMIT'], 'UNIQUE'],
                    ['Which SQL clause filters rows?', ['WHERE', 'GROUP BY', 'ORDER BY', 'SELECT'], 'WHERE'],
                    ['Which SQL function calculates an arithmetic mean?', ['AVG', 'COUNT', 'MAX', 'MIN'], 'AVG'],
                ],
                'statement' => 'A foreign key can enforce that an enrollment refers to an existing student.', 'truth' => 'True',
                'short' => ['Which operation cancels an incomplete transaction?', 'ROLLBACK'],
                'pairs' => [['Atomicity', 'All changes succeed or fail together'], ['Isolation', 'Concurrent operations do not interfere'], ['Durability', 'Committed changes persist']],
                'essay' => 'Explain how atomicity, isolation, and durability protect a course enrollment transaction.',
                'answer' => 'Atomicity avoids a partially saved enrollment. Isolation protects concurrent enrollment requests from interfering. Durability preserves an enrollment after the transaction commits.',
                'partial' => 'Atomicity means enrollment changes are saved together. Durability preserves the saved enrollment.',
                'reflection' => 'Describe a database modeling decision you would discuss with a registrar and how you would verify that the design supports their workflow.',
            ],
            'IT 323' => ['title' => 'Software Engineering', 'teacher' => 'lara.villanueva', 'join' => 'SOFT323',
                'description' => 'Turn stakeholder needs into verifiable requirements, plan incremental delivery, and evaluate software quality.',
                'lessons' => [
                    ['Stakeholders and Requirements', 'Requirements analysis', 'Stakeholders include users, operators, and sponsors. Functional requirements describe behavior. Acceptance criteria provide observable conditions for verifying that a requirement is met.'],
                    ['User Stories and Acceptance Criteria', 'Agile requirements', 'A user story states a role, a goal, and a benefit. Acceptance criteria describe expected outcomes. A product backlog orders work by value and priority.'],
                    ['Architecture and Quality Assurance', 'Quality assurance', 'Separation of concerns assigns each component a clear responsibility. Unit checks focus on a component, integration checks examine interactions, and user acceptance evaluates whether the system meets stakeholder needs.'],
                    ['Risk Management and Incremental Delivery', 'Project risk', 'Identify risks before delivery, estimate their likelihood and impact, and choose mitigations. Incremental delivery exposes problems early through smaller releases. Reviews identify defects, and feedback informs the next iteration.'],
                ],
                'questions' => [
                    ['Which requirement describes observable system behavior?', ['Functional requirement', 'Meeting agenda', 'Staff schedule', 'Budget note'], 'Functional requirement'],
                    ['What makes a requirement verifiable?', ['Observable acceptance criteria', 'A vague promise', 'A project nickname', 'An unrecorded opinion'], 'Observable acceptance criteria'],
                    ['Which artifact prioritizes future work?', ['Product backlog', 'Attendance list', 'Network address', 'Password hash'], 'Product backlog'],
                    ['Which checks examine interactions between components?', ['Integration checks', 'Spelling checks', 'Individual attendance', 'Budget reviews'], 'Integration checks'],
                    ['What should guide the next development iteration?', ['Stakeholder feedback', 'Unverified guesses', 'Random priorities', 'Ignored defects'], 'Stakeholder feedback'],
                ],
                'statement' => 'Acceptance criteria should describe observable expected outcomes.', 'truth' => 'True',
                'short' => ['What artifact orders planned work by value and priority?', 'Product backlog'],
                'pairs' => [['Unit checks', 'Examine one component'], ['Integration checks', 'Examine component interactions'], ['User acceptance', 'Evaluate stakeholder needs']],
                'essay' => 'Explain three practices that reduce delivery risk in a university software project.',
                'answer' => 'Identify and assess risks early, deliver small increments to reveal issues sooner, and use reviews with stakeholder feedback to improve the next iteration.',
                'partial' => 'Small releases expose problems early. Reviews can identify defects before the next release.',
                'reflection' => 'Describe a stakeholder disagreement you might encounter during requirements analysis and propose a way to reach a verifiable shared decision.',
            ],
        ];
    }
}
