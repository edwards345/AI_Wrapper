# AI Wrapper - API Key Setup (runs after install)
$ConfigDir = "$env:USERPROFILE\.aiwrapper"
$EnvFile = "$ConfigDir\.env"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Skip if already configured
if (Test-Path $EnvFile) {
    $result = [System.Windows.Forms.MessageBox]::Show(
        "API keys already configured. Reconfigure?",
        "AI Wrapper Setup",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($result -eq [System.Windows.Forms.DialogResult]::No) { exit 0 }
}

# Create form
$form = New-Object System.Windows.Forms.Form
$form.Text = "AI Wrapper - API Key Setup"
$form.Size = New-Object System.Drawing.Size(500, 420)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 35)
$form.ForeColor = [System.Drawing.Color]::White
$font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Font = $font

$y = 20

# Title
$title = New-Object System.Windows.Forms.Label
$title.Text = "Enter your API keys (leave blank to skip)"
$title.Location = New-Object System.Drawing.Point(20, $y)
$title.Size = New-Object System.Drawing.Size(450, 25)
$title.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 180)
$form.Controls.Add($title)
$y += 35

$keys = @(
    @{ Name = "ANTHROPIC_API_KEY"; Label = "Anthropic (Claude)"; URL = "console.anthropic.com" },
    @{ Name = "OPENAI_API_KEY"; Label = "OpenAI (ChatGPT)"; URL = "platform.openai.com" },
    @{ Name = "GEMINI_API_KEY"; Label = "Google (Gemini)"; URL = "aistudio.google.com" },
    @{ Name = "XAI_API_KEY"; Label = "xAI (Grok)"; URL = "console.x.ai" }
)

$textboxes = @()

foreach ($key in $keys) {
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = "$($key.Label)  ($($key.URL))"
    $lbl.Location = New-Object System.Drawing.Point(20, $y)
    $lbl.Size = New-Object System.Drawing.Size(450, 20)
    $lbl.ForeColor = [System.Drawing.Color]::FromArgb(200, 160, 120)
    $form.Controls.Add($lbl)
    $y += 22

    $txt = New-Object System.Windows.Forms.TextBox
    $txt.Location = New-Object System.Drawing.Point(20, $y)
    $txt.Size = New-Object System.Drawing.Size(440, 25)
    $txt.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 55)
    $txt.ForeColor = [System.Drawing.Color]::White
    $txt.BorderStyle = "FixedSingle"
    $txt.Tag = $key.Name
    $form.Controls.Add($txt)
    $textboxes += $txt
    $y += 40
}

# Save button
$btn = New-Object System.Windows.Forms.Button
$btn.Text = "Save && Continue"
$btn.Location = New-Object System.Drawing.Point(20, $y)
$btn.Size = New-Object System.Drawing.Size(440, 35)
$btn.BackColor = [System.Drawing.Color]::FromArgb(200, 160, 120)
$btn.ForeColor = [System.Drawing.Color]::FromArgb(50, 30, 15)
$btn.FlatStyle = "Flat"
$btn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$btn.Add_Click({
    if (-not (Test-Path $ConfigDir)) { New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null }

    $lines = @()
    foreach ($txt in $textboxes) {
        if ($txt.Text.Trim()) {
            $lines += "$($txt.Tag)=$($txt.Text.Trim())"
        }
    }

    if ($lines.Count -gt 0) {
        $lines -join "`n" | Set-Content -Path $EnvFile -NoNewline
        [System.Windows.Forms.MessageBox]::Show(
            "Saved $($lines.Count) key(s) to $EnvFile",
            "AI Wrapper",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
    }
    $form.Close()
})
$form.Controls.Add($btn)

$form.ShowDialog()
