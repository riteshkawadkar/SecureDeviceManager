using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.Policy;
using SDM.Application.Interfaces;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PoliciesController : ControllerBase
    {
        private readonly IPolicyService _policyService;

        public PoliciesController(IPolicyService policyService)
        {
            _policyService = policyService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var policies = await _policyService.GetAllAsync();
            return Ok(policies);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            var policy = await _policyService.GetByIdAsync(id);
            if (policy == null) return NotFound();
            return Ok(policy);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePolicyRequest request)
        {
            var policy = await _policyService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = policy.Id }, policy);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdatePolicyRequest request)
        {
            var policy = await _policyService.UpdateAsync(id, request);
            if (policy == null) return NotFound();
            return Ok(policy);
        }

        [HttpPatch("{id:guid}/toggle")]
        public async Task<IActionResult> Toggle([FromRoute] Guid id)
        {
            var policy = await _policyService.ToggleAsync(id);
            if (policy == null) return NotFound();
            return Ok(policy);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id)
        {
            var result = await _policyService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpPost("{id:guid}/enforce")]
        public async Task<IActionResult> Enforce([FromRoute] Guid id)
        {
            try
            {
                var result = await _policyService.EnforceAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
